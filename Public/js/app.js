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
      "wss://lsp.swift-playground.com/lang-server/api"
    );

    languageServer.onconnect = () => {
      languageServer.openDocument(this.editor.getValue());
    };
    languageServer.onclose = () => {
      this.updateLanguageServerStatus(false);
    };

    languageServer.onresponse = (response) => {
      const promise = promises[response.id];
      // Each request gets exactly one response, so drop the entry now. Without
      // this, `promises` grows unbounded as hover/completion/signatureHelp fire
      // while typing. No-op for diagnostics/format, which carry no id.
      delete promises[response.id];
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
                // sourcekit-lsp already ships documentation inline as a
                // MarkupContent ({ kind, value }); pass it as a Markdown string
                // so Monaco shows it in the suggestion details panel.
                const documentation = item.documentation
                  ? item.documentation.value !== undefined
                    ? { value: item.documentation.value }
                    : item.documentation
                  : undefined;
                return {
                  label: item.label,
                  kind: kind,
                  detail: item.detail,
                  documentation: documentation,
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
          break;
        case "signatureHelp": {
          if (!promise) {
            return;
          }
          if (response.value && response.value.signatures) {
            const signatures = response.value.signatures.map((sig) => ({
              label: sig.label,
              documentation: sig.documentation
                ? sig.documentation.value ?? sig.documentation
                : undefined,
              parameters: (sig.parameters || []).map((parameter) => ({
                label: parameter.label,
                documentation: parameter.documentation
                  ? parameter.documentation.value ?? parameter.documentation
                  : undefined,
              })),
              activeParameter: sig.activeParameter,
            }));
            promise.fulfill({
              value: {
                signatures: signatures,
                activeSignature: response.value.activeSignature ?? 0,
                activeParameter: response.value.activeParameter ?? 0,
              },
              dispose: () => {},
            });
          } else {
            promise.fulfill();
          }
          break;
        }
        case "diagnostics":
          this.updateLanguageServerStatus(true);
          this.editor.clearMarkers();
          // Reset the fix-its surfaced as Quick Fix code actions; repopulated
          // below from the new diagnostics (sourcekit-lsp ships them inline).
          this.codeActionEntries = [];

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
            const endColumn = end.character + 1;

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
              // Fall back to a stable source so LSP markers are always
              // distinguishable from runner markers (which set no source) when
              // matching fix-its below.
              source: diagnostic.source ?? "sourcekit-lsp",
            };
          });

          this.codeActionEntries = diagnostics
            .filter((diagnostic) => diagnostic.codeActions?.length)
            .map((diagnostic) => ({
              startLineNumber: diagnostic.range.start.line + 1,
              startColumn: diagnostic.range.start.character + 1,
              message: diagnostic.message,
              source: diagnostic.source ?? "sourcekit-lsp",
              actions: diagnostic.codeActions,
            }));

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

    this.editor.onsignaturehelp = (position) => {
      if (!languageServer.isReady) {
        return;
      }

      sequence++;
      const row = position.lineNumber - 1;
      const column = position.column - 1;
      languageServer.requestSignatureHelp(sequence, row, column);

      return new Promise((fulfill, reject) => {
        promises[sequence] = { fulfill: fulfill, reject: reject };
      });
    };

    // Quick Fix: turn the fix-its sourcekit-lsp ships on each diagnostic into
    // Monaco code actions for the markers under the cursor. No round-trip —
    // the data already arrived with the diagnostics notification.
    this.editor.oncodeaction = (model, _range, context) => {
      const entries = this.codeActionEntries || [];
      const markers = (context && context.markers) || [];

      const toEdits = (lspAction) => {
        const changes = lspAction.edit && lspAction.edit.changes;
        if (!changes) {
          return null;
        }
        const edits = [];
        // The document URI is the server's temp path; apply every edit to the
        // single local model regardless of the key.
        for (const uri of Object.keys(changes)) {
          for (const textEdit of changes[uri]) {
            edits.push({
              resource: model.uri,
              versionId: undefined,
              textEdit: {
                range: {
                  startLineNumber: textEdit.range.start.line + 1,
                  startColumn: textEdit.range.start.character + 1,
                  endLineNumber: textEdit.range.end.line + 1,
                  endColumn: textEdit.range.end.character + 1,
                },
                text: textEdit.newText,
              },
            });
          }
        }
        return edits.length ? edits : null;
      };

      const actions = [];
      for (const marker of markers) {
        const entry = entries.find(
          (e) =>
            e.source === marker.source &&
            e.startLineNumber === marker.startLineNumber &&
            e.startColumn === marker.startColumn &&
            e.message === marker.message
        );
        if (!entry) {
          continue;
        }
        for (const lspAction of entry.actions) {
          const edits = toEdits(lspAction);
          if (!edits) {
            continue;
          }
          actions.push({
            title: lspAction.title,
            kind: lspAction.kind || "quickfix",
            diagnostics: [marker],
            edit: { edits: edits },
            isPreferred: lspAction.isPreferred,
          });
        }
      }
      return { actions: actions, dispose: () => {} };
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

  async run() {
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

    const markers = await runner.run(params);

    runButton.classList.remove("disabled");
    if (stopButton) {
      stopButton.classList.add("disabled");
    }

    document.getElementById("run-button-icon").classList.remove("d-none");
    document.getElementById("run-button-spinner").classList.add("d-none");

    this.editor.updateMarkers(markers);
    this.editor.focus();

    if (stopButton) {
      stopButton.removeEventListener("click", stopRunner);
    }
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
            "<p class='p-0 m-0'><b>Language Server Status:</b></p><p class='p-0 m-0 text-end'>Ready&nbsp;<i class='bi bi-check-circle-fill icon-fw'></i></p>"
          );
          const tooltip = Tooltip.getInstance(statusContainer);
          tooltip.hide();
        }
      } else {
        statusIcon.src = "/images/lsp.svg";
        if (statusContainer) {
          statusContainer.setAttribute(
            "data-bs-original-title",
            "<p class='p-0 m-0'><b>Language Server Status:</b></p><p class='p-0 m-0 text-end'>Initializing...&nbsp;<i class='bi bi-arrow-repeat icon-spin icon-fw'></i></p>"
          );
          const tooltip = Tooltip.getInstance(statusContainer);
          tooltip.hide();
        }
      }
    }
  }
}
