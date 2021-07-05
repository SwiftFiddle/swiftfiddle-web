"use strict";

import { Editor } from "./editor.js";
import { Console } from "./console.js";
import { LanguageServer } from "./language_server.js";
import { Runner } from "./runner.js";
import {
  showShareSheet,
  copySharedLink,
  copyEmbedSnippet,
} from "./share_sheet.js";
import { uuidv4 } from "./uuid.js";

export class App {
  constructor(config) {
    const initialText = config.initialText;
    this.isEmbedded = config.isEmbedded;
    const foldingRanges = config.foldingRanges;

    this.editor = new Editor(initialText, this.isEmbedded);
    this.console = new Console(document.getElementById("terminal"));
    this.history = [];

    this.editor.onready = () => {
      const promises = [];
      let sequence = 0;

      const languageServer = new LanguageServer("wss://lsp.swiftfiddle.com/");

      languageServer.onconnect = () => {
        languageServer.openDocument(this.editor.getValue());
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
                  const kind = languageServer.convertCompletionItemKind(
                    item.kind
                  );
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
            this.editor.clearMarkers();

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

            this.editor.updateMarkers(markers);
            break;
          default:
            break;
        }
      };

      this.editor.onaction = (action) => {
        switch (action) {
          case "run":
            run();
            break;
          case "share":
            showShareSheet(this.editor.getValue());
            break;
          default:
            break;
        }
      };

      window.addEventListener("unload", () => {
        languageServer.close();
      });

      this.editor.onchange = () => {
        languageServer.syncDocument(this.editor.getValue());
        updateButtonState(this.editor);
      };
      updateButtonState(this.editor);

      this.editor.onhover = (position) => {
        if (!languageServer.isReady) {
          return;
        }

        sequence++;
        const row = position.lineNumber - 1;
        const column = position.column - 1;
        languageServer.requestHover(sequence, row, column);

        return new Promise((fulfill, reject) => {
          promises[sequence] = { fulfill: fulfill, reject: reject };
        });
      };

      this.editor.oncompletion = (position) => {
        if (!languageServer.isReady) {
          return;
        }

        sequence++;
        const row = position.lineNumber - 1;
        const column = position.column - 1;
        languageServer.requestCompletion(sequence, row, column);

        const promise = new Promise((fulfill, reject) => {
          promises[sequence] = { fulfill: fulfill, reject: reject };
        });
        return promise;
      };

      if (foldingRanges && foldingRanges.length) {
        this.editor.fold(foldingRanges);
      }

      this.editor.focus();
      this.editor.scrollToBottm();
      $("#run-button").removeClass("disabled");
    };

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    $("#run-button").addClass("disabled");
    $("#run-button").click((event) => {
      event.preventDefault();
      this.run();
    });

    $(".selectpicker").selectpicker({
      iconBase: "fas",
      tickIcon: "fa-check",
    });

    $("#terminal").mouseenter((event) => {
      $("#terminal>div.toolbar").fadeTo("normal", 1);
    });

    $("#terminal").mouseleave((event) => {
      $("#terminal>div.toolbar").fadeTo("normal", 0);
    });

    $("#clear-button").on("click", (event) => {
      event.preventDefault();
      this.console.clear();
      this.history.length = 0;
    });

    if (this.isEmbedded) {
      $("#terminal").unbind("mouseenter");
      $("#terminal").unbind("mouseleave");
      $("#clear-button").unbind("click");
    }

    $("#version-picker").on("change", (event) => {
      if (event.target.value < "5.3") {
        $(".package-available").hide();
        $(".package-unavailable").show();
      } else {
        $(".package-available").show();
        $(".package-unavailable").hide();
      }
    });

    $("#share-button").on("click", (event) => {
      showShareSheet(this.editor.getValue());
    });
    $("#shared-link-copy-button").on("click", (event) => {
      copySharedLink();
    });
    $("#embed-snippet-copy-button").on("click", (event) => {
      copyEmbedSnippet();
    });

    const editorContainer = document.getElementById("editor");
    editorContainer.addEventListener(
      "dragover",
      this.handleDragOver.bind(this),
      false
    );
    editorContainer.addEventListener(
      "drop",
      this.handleFileSelect.bind(this),
      false
    );
  }

  handleFileSelect(event) {
    event.stopPropagation();
    event.preventDefault();

    const files = event.dataTransfer.files;
    const reader = new FileReader();
    reader.onload = (event) => {
      this.editor.setValue(event.target.result);
      this.editor.setSelection(0, 0, 0, 0);
    };
    reader.readAsText(files[0], "UTF-8");
  }

  handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  run() {
    if ($("#run-button-spinner").is(":visible")) {
      return;
    }

    this.editor.clearMarkers();
    this.showLoading();

    this.console.saveCursorPosition();
    this.console.switchAlternateBuffer();
    this.console.moveCursorTo(0, 0);
    this.console.hideCursor();

    const altBuffer = [];
    const cancelToken = this.console.showSpinner("Running", () => {
      return altBuffer.filter(Boolean);
    });

    const params = {
      toolchain_version: $("#version-picker").val(),
      code: this.editor.getValue(),
      _color: true,
      _nonce: uuidv4(),
    };

    const runner = new Runner();
    runner.onmessage = () => {
      altBuffer.length = 0;
      altBuffer.push(...this.parseMessage(e.data));
    };

    runner.run(params, (buffer, stderr) => {
      this.console.hideSpinner(cancelToken);
      this.console.switchNormalBuffer();
      this.console.showCursor();
      this.console.restoreCursorPosition();
      this.console.reset();

      this.history.forEach((line) => {
        const regex =
          /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
        const plainText = line.replace(regex, "");
        this.console.write(`\x1b[2m${plainText}`);
      });
      this.history.push(...buffer);

      buffer.forEach((line) => {
        this.console.write(line);
      });

      const markers = this.parseErrorMessage(stderr);
      this.editor.updateMarkers(markers);

      this.hideLoading();
      this.editor.focus();
    });
  }

  showLoading() {
    if (!this.isEmbedded) {
      $("#run-button-text").hide();
    }
    $("#run-button").addClass("disabled");
    $("#run-button-icon").hide();
    $("#run-button-spinner").show();
  }

  hideLoading() {
    $("#run-button").removeClass("disabled");
    $("#run-button-icon").show();
    $("#run-button-spinner").hide();
    if (!this.isEmbedded) {
      $("#run-button-text").show();
    }
  }

  parseMessage(message) {
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

  parseErrorMessage(message) {
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
}

function updateButtonState(editor) {
  const value = editor.getValue();
  if (!value || !value.trim()) {
    $("#run-button").prop("disabled", true);
    $("#share-button").prop("disabled", true);
  } else {
    $("#run-button").prop("disabled", false);
    $("#share-button").prop("disabled", false);
  }
}
