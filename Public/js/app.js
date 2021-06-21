"use strict";

import { LanguageServer } from "./language_server.js";
import { showShareSheet } from "./share_sheet.js";

let monacoEditor;

export const presentShareSheet = () => {
  showShareSheet(monacoEditor);
};

export const EditorContext = { doc: "" };
export const EmbeddedEditorContext = {};

$(".selectpicker").selectpicker({
  iconBase: "fas",
  tickIcon: "fa-check",
});

$("#terminal").mouseenter(function () {
  $("#terminal>div.toolbar").fadeTo("normal", 1);
});

$("#terminal").mouseleave(function () {
  $("#terminal>div.toolbar").fadeTo("normal", 0);
});

$("#clear-button").on("click", function (e) {
  e.preventDefault();
  terminal.clear();
});

$("#version-picker").on("change", function () {
  if (this.value < "5.3") {
    $(".package-available").hide();
    $(".package-unavailable").show();
  } else {
    $(".package-available").show();
    $(".package-unavailable").hide();
  }
});

$("#run-button").addClass("disabled");
$("#run-button").click(function (e) {
  e.preventDefault();
  run(monacoEditor);
});

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.25.1/min/vs",
  },
});
window.MonacoEnvironment = {
  getWorkerUrl: () => proxy,
};
const proxy = URL.createObjectURL(
  new Blob(
    [
      `
self.MonacoEnvironment = {
    baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.25.1/min'
};
importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.25.1/min/vs/base/worker/workerMain.min.js');
`,
    ],
    {
      type: "text/javascript",
    }
  )
);

require(["vs/editor/editor.main"], function () {
  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: EditorContext.doc,
    fontSize: "14pt",
    lineHeight: 21,
    language: "swift",
    wordWrap: "on",
    wrappingIndent: "indent",
    tabSize: 2,
    lightbulb: {
      enabled: true,
    },
    minimap: {
      enabled: false,
    },
    theme: "vs-light",
    showFoldingControls: "mouseover",
  });

  editor.addAction({
    id: "run",
    label: "Run",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run: () => {
      run(editor);
    },
  });
  editor.addAction({
    id: "save",
    label: "Share",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
    run: () => {
      showShareSheet(editor);
    },
  });

  if (EmbeddedEditorContext.isEmbedded) {
    $("#terminal").unbind("mouseenter");
    $("#terminal").unbind("mouseleave");
    $("#clear-button").unbind("click");

    editor.updateOptions({
      readOnly: true,
      renderIndentGuides: false,
      glyphMargin: false,
      lineNumbersMinChars: 4,
      lineDecorationsWidth: 6,
    });
  }
  if (EmbeddedEditorContext.foldingRanges) {
    editor.trigger("fold", "editor.foldAll");
  }

  editor.focus();
  editor.setPosition({
    column:
      editor.getModel().getLineLength(editor.getModel().getLineCount()) + 1,
    lineNumber: editor.getModel().getLineCount(),
  });
  editor.revealLine(editor.getModel().getLineCount());

  const sessionId = uuidv4();
  const promises = [];
  let sequence = 0;

  const languageServer = new LanguageServer(
    "wss://lsp.swiftfiddle.com/",
    sessionId
  );

  languageServer.onconnect = () => {
    const code = editor.getValue();
    languageServer.openDocument(code, sessionId);
  };

  languageServer.onresponse = (response) => {
    const promise = promises[response.id];
    switch (response.method) {
      case "hover":
        if (!promise) {
          return;
        }
        if (response.value) {
          const range = new monaco.Range(
            response.position.line,
            response.position.utf16index,
            response.position.line,
            response.position.utf16index
          );
          promise.fulfill({
            range: range,
            contents: [{ value: response.value.contents.value }],
          });
        } else {
          promise.fulfill();
        }
        break;
      case "completion":
        if (!promise) {
          return;
        }
        if (response.value) {
          const completions = {
            suggestions: response.value.items.map((item) => {
              const textEdit = item.textEdit;
              const start = textEdit.range.start;
              const end = textEdit.range.end;
              const kind = languageServer.convertCompletionItemKind(item.kind);
              const range = new monaco.Range(
                start.line + 1,
                start.character + 1,
                end.line + 1,
                end.character + 1
              );
              return {
                label: item.label,
                kind: kind,
                detail: item.detail,
                filterText: item.filterText,
                insertText: textEdit.newText,
                range: range,
              };
            }),
          };
          promise.fulfill(completions);
        } else {
          promise.fulfill();
        }
      case "diagnostics":
        clearMarkers();

        if (!response.value) {
          return;
        }
        const diagnostics = response.value.diagnostics;
        if (!diagnostics || !diagnostics.length) {
          return;
        }

        const markers = diagnostics.map((diagnostic) => {
          const start = diagnostic.range.start;
          const end = diagnostic.range.end;
          const startLineNumber = start.line + 1;
          const startColumn = start.character + 1;
          const endLineNumber = end.line + 1;
          const endColumn = start.character + 1;

          let severity = languageServer.convertDiagnosticSeverity(
            diagnostic.severity
          );

          return {
            startLineNumber: startLineNumber,
            startColumn: startColumn,
            endLineNumber: endLineNumber,
            endColumn: endColumn,
            message: diagnostic.message,
            severity: severity,
            source: diagnostic.source,
          };
        });

        updateMarkers(markers);
        break;
      default:
        break;
    }
  };

  window.addEventListener("unload", () => {
    languageServer.close();
  });

  editor.onDidChangeModelContent(function () {
    const code = editor.getValue();
    languageServer.syncDocument(code, sessionId);

    if (!code || !code.trim()) {
      $("#run-button").prop("disabled", true);
      $("#share-button").prop("disabled", true);
    } else {
      $("#run-button").prop("disabled", false);
      $("#share-button").prop("disabled", false);
    }
  });

  monaco.languages.registerHoverProvider("swift", {
    provideHover: function (model, position) {
      if (!languageServer.isReady) {
        return;
      }

      sequence++;
      const row = position.lineNumber - 1;
      const column = position.column - 1;
      languageServer.requestHover(sequence, row, column, sessionId);

      const promise = new Promise((fulfill, reject) => {
        promises[sequence] = { fulfill: fulfill, reject: reject };
      });
      return promise;
    },
  });

  monaco.languages.registerCompletionItemProvider("swift", {
    triggerCharacters: ["."],
    provideCompletionItems: function (model, position) {
      if (!languageServer.isReady) {
        return;
      }

      sequence++;
      const row = position.lineNumber - 1;
      const column = position.column - 1;
      languageServer.requestCompletion(sequence, row, column, sessionId);

      const promise = new Promise((fulfill, reject) => {
        promises[sequence] = { fulfill: fulfill, reject: reject };
      });
      return promise;
    },
  });

  monaco.languages.registerFoldingRangeProvider("swift", {
    provideFoldingRanges: function (model, context, token) {
      return EmbeddedEditorContext.foldingRanges;
    },
  });

  monacoEditor = editor;
  $("#run-button").removeClass("disabled");
});

const normalBuffer = [];

function run(editor) {
  if (!monacoEditor || $("#run-button-spinner").is(":visible")) {
    return;
  }
  clearMarkers();
  showLoading();

  Terminal.saveCursorPosition();
  Terminal.switchAlternateBuffer();
  Terminal.moveCursorTo(0, 0);
  Terminal.hideCursor();
  const altBuffer = [];
  const cancelToken = Terminal.showSpinner("Running", () => {
    return altBuffer.filter(Boolean);
  });

  const nonce = uuidv4();
  const params = {
    toolchain_version: $("#version-picker").val(),
    code: editor.getValue(),
    _color: true,
    _nonce: nonce,
  };

  const connection = new WebSocket(webSocketEndpoint(`${nonce}/run`));
  connection.onmessage = (e) => {
    altBuffer.length = 0;
    altBuffer.push(...parseMessage(e.data));
  };

  const startTime = performance.now();
  $.post("/run", params)
    .done(function (data) {
      Terminal.hideSpinner(cancelToken);
      Terminal.switchNormalBuffer();
      Terminal.showCursor();
      Terminal.restoreCursorPosition();
      terminal.reset();
      normalBuffer.forEach((line) => {
        const regex =
          /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
        const plainText = line.replace(regex, "");
        terminal.write(`\x1b[2m${plainText}`);
      });

      const endTime = performance.now();
      const execTime = ` ${((endTime - startTime) / 1000).toFixed(0)}s`;

      const now = new Date();
      const timestamp = now.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const buffer = [];
      buffer.push(
        `\x1b[38;5;72m${data.version
          .split("\n")
          .map((line, i) => {
            const padding =
              terminal.cols - line.length - timestamp.length - execTime.length;
            let _1 = "";
            if (padding < 0) {
              _1 = `\x1b[0m${timestamp}${execTime}\n`;
            } else {
              _1 = "";
            }
            let _2 = "";
            if (padding >= 0) {
              _2 = `${" ".repeat(padding)}\x1b[0m${timestamp}${execTime}`;
            } else {
              _2 = "";
            }
            if (i == 0) {
              return `${_1}\x1b[38;5;156m\x1b[2m${line}\x1b[0m${_2}`;
            } else {
              return `\x1b[38;5;156m\x1b[2m${line}\x1b[0m`;
            }
          })
          .join("\n")}\x1b[0m`
      );

      const matchTimeout = data.errors.match(
        /Maximum execution time of \d+ seconds exceeded\./
      );
      if (matchTimeout) {
        buffer.push(`${data.errors.replace(matchTimeout[0], "")}\x1b[0m`);
      } else {
        buffer.push(`${data.errors}\x1b[0m`);
      }

      if (data.output) {
        buffer.push(`\x1b[37m${data.output}\x1b[0m`);
      } else {
        buffer.push(`\x1b[0m\x1b[1m*** No output. ***\x1b[0m\n`);
      }

      if (matchTimeout) {
        buffer.push(`\x1b[31;1m${matchTimeout[0]}\n`); // Timeout error message
      }

      buffer.forEach((line) => {
        terminal.write(line);
      });
      normalBuffer.push(...buffer);

      const markers = parseErrorMessage(data.errors);
      updateMarkers(markers);
    })
    .fail(function (response) {
      Terminal.hideSpinner(cancelToken);
      alert(`[Status: ${response.status}] Something went wrong`);
    })
    .always(function () {
      connection.close();
      hideLoading();
      editor.focus();
    });
}

function clearMarkers() {
  monaco.editor.setModelMarkers(monacoEditor.getModel(), "swift", []);
}

function parseErrorMessage(message) {
  const matches = message
    .replace(
      // Remove all ANSI colors/styles from strings
      // https://stackoverflow.com/a/29497680/1733883
      // https://github.com/chalk/ansi-regex/blob/main/index.js#L3
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    )
    .matchAll(
      /\/\[REDACTED\]\/main\.swift:(\d+):(\d+): (error|warning|note): ([\s\S]*?)\n*(?=(?:\/|$))/gi
    );
  return [...matches].map((match) => {
    const row = +match[1] - 4; // 4 lines of code inserted by default
    let column = +match[2];
    const text = match[4];
    const type = match[3];
    let severity;
    switch (type) {
      case "warning":
        severity = monaco.MarkerSeverity.Warning;
        break;
      case "error":
        severity = monaco.MarkerSeverity.Error;
        break;
      default:
        severity = monaco.MarkerSeverity.Info;
        break;
    }

    let length;
    if (text.match(/~+\^~+/)) {
      // ~~~^~~~
      length = text.match(/~+\^~+/)[0].length;
      column -= text.match(/~+\^/)[0].length - 1;
    } else if (text.match(/\^~+/)) {
      // ^~~~
      length = text.match(/\^~+/)[0].length;
    } else if (text.match(/~+\^/)) {
      // ~~~^
      length = text.match(/~+\^/)[0].length;
      column -= length - 1;
    } else if (text.match(/\^/)) {
      // ^
      length = 1;
    }

    return {
      startLineNumber: row,
      startColumn: column,
      endLineNumber: row,
      endColumn: column + length,
      message: text,
      severity: severity,
    };
  });
}

function updateMarkers(markers) {
  monaco.editor.setModelMarkers(monacoEditor.getModel(), "swift", markers);
}

function parseMessage(message) {
  const lines = [];

  const data = JSON.parse(message);
  const version = data.version;
  const stderr = data.errors;
  const stdout = data.output;

  if (version) {
    lines.push(
      ...version
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          return {
            text: `\x1b[38;5;156m\x1b[2m${line}\x1b[0m`,
            numberOfLines: Math.ceil(line.length / terminal.cols),
          };
        })
    );
  }
  if (stderr) {
    lines.push(
      ...stderr
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          return {
            text: `${line}\x1b[0m`,
            numberOfLines: Math.ceil(line.length / terminal.cols),
          };
        })
    );
  }
  if (stdout) {
    lines.push(
      ...stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          return {
            text: `\x1b[37m${line}\x1b[0m`,
            numberOfLines: Math.ceil(line.length / terminal.cols),
          };
        })
    );
  }

  return lines;
}

function showLoading() {
  if (!EmbeddedEditorContext.isEmbedded) {
    $("#run-button-text").hide();
  }
  $("#run-button").addClass("disabled");
  $("#run-button-icon").hide();
  $("#run-button-spinner").show();
}

function hideLoading() {
  $("#run-button").removeClass("disabled");
  $("#run-button-icon").show();
  $("#run-button-spinner").hide();
  if (!EmbeddedEditorContext.isEmbedded) {
    $("#run-button-text").show();
  }
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

function webSocketEndpoint(path) {
  const location = window.location;
  // prettier-ignore
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/${path}`
}

function handleFileSelect(event) {
  event.stopPropagation();
  event.preventDefault();

  const files = event.dataTransfer.files;
  const reader = new FileReader();
  reader.onload = (event) => {
    monacoEditor.setValue(event.target.result);
    monacoEditor.setSelection(new monaco.Selection(0, 0, 0, 0));
  };
  reader.readAsText(files[0], "UTF-8");
}

function handleDragOver(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

const dropZone = document.getElementById("editor");
dropZone.addEventListener("dragover", handleDragOver, false);
dropZone.addEventListener("drop", handleFileSelect, false);
