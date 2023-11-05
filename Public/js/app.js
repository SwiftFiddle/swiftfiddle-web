"use strict";

import Worker from "worker-loader!./worker.js";

import { Tooltip } from "bootstrap";
import { LanguageServer } from "./language_server.js";
import { Runner } from "./runner.js";
import { uuidv4 } from "./uuid.js";
import {
  runButton,
  stopButton,
  clearConsoleButton,
  formatButton,
  shareButton,
} from "./ui_control.js";

export class App {
  constructor(editor, terminal, versionPicker) {
    this.editor = editor;
    this.terminal = terminal;
    this.versionPicker = versionPicker;

    if (window.Worker) {
      const debounce = (() => {
        const timers = {};
        return function (callback, delay, id) {
          delay = delay || 400;
          id = id || "duplicated event";
          if (timers[id]) {
            clearTimeout(timers[id]);
          }
          timers[id] = setTimeout(callback, delay);
        };
      })();
      this.worker = new Worker();
      this.worker.onmessage = (e) => {
        if (e.data && e.data.type === "encode") {
          debounce(
            () => {
              history.replaceState(null, "", e.data.value);
            },
            400,
            "update_location"
          );
        }
      };
    }

    this.history = [];

    const promises = [];
    let sequence = 0;

    const languageServer = new LanguageServer(
      "wss://swiftfiddle.com/lang-server/api"
    );

    languageServer.onconnect = () => {
      languageServer.openDocument(this.editor.getValue());
    };
    languageServer.onclose = () => {
      this.updateLanguageServerStatus(false);
    };

    languageServer.onresponse = (response) => {
      const promise = promises[response.id];
      switch (response.method) {
        case "hover":
          if (!promise) {
            return;
          }
          if (response.value) {
            const range = {
              startLineNumber: response.position.line,
              startColumn: response.position.utf16index,
              endLineNumber: response.position.line,
              endColumn: response.position.utf16index,
            };
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
                const range = {
                  startLineNumber: start.line + 1,
                  startColumn: start.character + 1,
                  endLineNumber: end.line + 1,
                  endColumn: end.character + 1,
                };
                return {
                  label: item.label,
                  kind: kind,
                  detail: item.detail,
                  filterText: item.filterText,
                  insertText: textEdit.newText,
                  insertTextRules: languageServer.insertTextRule(),
                  range: range,
                };
              }),
            };
            promise.fulfill(completions);
          } else {
            promise.fulfill();
          }
        case "diagnostics":
          this.updateLanguageServerStatus(true);
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
        case "format":
          if (response.value) {
            this.editor.setValue(response.value);
          }
        default:
          break;
      }
    };

    this.editor.onaction = (action) => {
      switch (action) {
        case "run":
          this.run();
          break;
        case "share":
          const shareButton = document.getElementById("share-button");
          if (shareButton.classList.contains("disabled")) {
            return;
          }
          shareButton.click();
          break;
        default:
          break;
      }
    };

    window.addEventListener("unload", () => {
      languageServer.close();
    });

    this.editor.onchange = () => {
      if (!languageServer.isReady) {
        return;
      }

      const value = this.editor.getValue();
      languageServer.syncDocument(value);

      this.updateButtonState();
      this.saveEditState();
    };
    this.updateButtonState();

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

    this.editor.focus();
    this.editor.scrollToBottm();

    if (formatButton) {
      formatButton.addEventListener("click", (event) => {
        event.preventDefault();

        if (!languageServer.isReady) {
          return;
        }
        languageServer.requestFormat(this.editor.getValue());
      });
    }

    runButton.addEventListener("click", (event) => {
      event.preventDefault();
      this.run();
    });
    if (stopButton) {
      stopButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.run();
      });
    }

    if (clearConsoleButton) {
      clearConsoleButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.terminal.clear();
        this.history.length = 0;
      });
    }

    const editorContainer = document.getElementById("editor-container");
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

    this.versionPicker.onchange = () => {
      this.saveEditState();
    };
  }

  handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
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

  run() {
    if (runButton.classList.contains("disabled")) {
      return;
    }

    runButton.classList.add("disabled");
    if (stopButton) {
      stopButton.classList.remove("disabled");
    }

    document.getElementById("run-button-icon").classList.add("d-none");
    document.getElementById("run-button-spinner").classList.remove("d-none");

    this.editor.clearMarkers();
    this.terminal.hideCursor();

    const params = {
      toolchain_version: this.versionPicker.selected,
      code: this.editor.getValue(),
      _color: true,
      _nonce: uuidv4(),
    };
    if (window.appConfig.timeout) {
      const integer = Number.parseInt(window.appConfig.timeout, 10);
      if (integer && integer >= 30 && integer <= 600) {
        params.timeout = Math.max(30, Math.min(600, integer));
      }
    }
    if (window.appConfig.compilerOptions) {
      params.options = window.appConfig.compilerOptions;
    }

    const runner = new Runner(this.terminal);

    let stopRunner;
    if (stopButton) {
      stopRunner = () => {
        runner.stop();
        stopButton.removeEventListener("click", stopRunner);
      };
      stopButton.addEventListener("click", stopRunner);
    }

    runner.run(params, (buffer, stderr, error, isCancel) => {
      runButton.classList.remove("disabled");
      if (stopButton) {
        stopButton.classList.add("disabled");
      }

      document.getElementById("run-button-icon").classList.remove("d-none");
      document.getElementById("run-button-spinner").classList.add("d-none");

      this.terminal.showCursor();

      const markers = this.parseErrorMessage(stderr);
      this.editor.updateMarkers(markers);
      this.editor.focus();

      if (stopButton) {
        stopButton.removeEventListener("click", stopRunner);
      }
    });
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
        /(?:\/main\.swift|<stdin>):(\d+):(\d+): (error|warning|note): ([\s\S]*?)\n*(?=(?:\/|$))/gi
      );
    return [...matches].map((match) => {
      const row = +match[1];
      let column = +match[2];
      const text = match[4];
      const type = match[3];
      let severity;
      switch (type) {
        case "warning":
          severity = 4; // monaco.MarkerSeverity.Warning;
          break;
        case "error":
          severity = 8; // monaco.MarkerSeverity.Error;
          break;
        default: // monaco.MarkerSeverity.Info;
          severity = 2;
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

  saveEditState() {
    if (!this.worker) {
      return;
    }
    const code = this.editor.getValue();
    const version = this.versionPicker.selected;
    if (!code || !version) {
      return;
    }
    this.worker.postMessage({
      type: "encode",
      value: {
        code: code,
        version: version,
      },
    });
  }

  updateButtonState() {
    const value = this.editor.getValue();
    if (!value || !value.trim()) {
      runButton.classList.add("disabled");
      if (shareButton) {
        shareButton.classList.add("disabled");
      }
    } else {
      runButton.classList.remove("disabled");
      if (shareButton) {
        shareButton.classList.remove("disabled");
      }
    }
  }

  updateLanguageServerStatus(enabled) {
    const statusIcon = document.getElementById("lang-server-status-icon");
    const statusContainer = document.getElementById("lang-server-status");
    if (statusIcon) {
      if (enabled) {
        statusIcon.src = "/images/lsp_fill.svg";
        if (statusContainer) {
          statusContainer.setAttribute(
            "data-bs-original-title",
            "<p class='p-0 m-0'><b>Language Server Status:</b></p><p class='p-0 m-0 text-end'>Ready&nbsp;<span class='fas fa-check-circle fa-fw'></span></p>"
          );
          const tooltip = Tooltip.getInstance(statusContainer);
          tooltip.hide();
        }
      } else {
        statusIcon.src = "/images/lsp.svg";
        if (statusContainer) {
          statusContainer.setAttribute(
            "data-bs-original-title",
            "<p class='p-0 m-0'><b>Language Server Status:</b></p><p class='p-0 m-0 text-end'>Initializing...&nbsp;<span class='fad fa-spinner-third fa-spin fa-fw'></span></p>"
          );
          const tooltip = Tooltip.getInstance(statusContainer);
          tooltip.hide();
        }
      }
    }
  }
}
