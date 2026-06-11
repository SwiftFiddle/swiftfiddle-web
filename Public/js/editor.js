"use strict";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export class Editor {
  constructor(container, options) {
    this.editor = monaco.editor.create(container, options);

    this.editor.onDidChangeModelContent(() => {
      this.onchange();
    });

    monaco.languages.registerHoverProvider("swift", {
      provideHover: (model, position) => {
        return this.onhover(position);
      },
    });

    this.editor.addAction({
      id: "run",
      label: "Run",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        this.onaction("run");
      },
    });
    this.editor.addAction({
      id: "share",
      label: "Share",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        this.onaction("share");
      },
    });

    // Trigger completion after "." as well as after these characters, which
    // commonly start a new identifier/argument in Swift. Whitespace is
    // intentionally excluded: it's typed constantly and quickSuggestions
    // already pops the list once the next identifier is started, so a space
    // trigger would only generate heavy, unfiltered requests.
    monaco.languages.registerCompletionItemProvider("swift", {
      triggerCharacters: [".", "(", ":", "<", ","],
      provideCompletionItems: (model, position) => {
        return this.oncompletion(position);
      },
    });

    // Parameter hints (Xcode-style): pops up the function signature with the
    // active argument highlighted when typing "(" or ",".
    monaco.languages.registerSignatureHelpProvider("swift", {
      signatureHelpTriggerCharacters: ["(", ","],
      signatureHelpRetriggerCharacters: [",", ")"],
      provideSignatureHelp: (model, position) => {
        return this.onsignaturehelp(position);
      },
    });

    // Explicit Ctrl+Space to trigger completion, like Xcode. (Cmd+Space is
    // taken by Spotlight on macOS, so bind WinCtrl = the Control key.)
    this.editor.addAction({
      id: "trigger-suggest",
      label: "Trigger Suggest",
      keybindings: [monaco.KeyMod.WinCtrl | monaco.KeyCode.Space],
      run: (ed) => {
        ed.trigger("keyboard", "editor.action.triggerSuggest", {});
      },
    });

    this.onchange = () => {};
    this.onhover = () => {};
    this.oncompletion = () => {};
    this.onsignaturehelp = () => {};
    this.onaction = () => {};
  }

  getValue() {
    return this.editor.getValue();
  }

  setValue(value) {
    this.editor.setValue(value);
  }

  setSelection(startLineNumber, startColumn, endLineNumber, endColumn) {
    this.editor.setSelection(
      new monaco.Selection(
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn
      )
    );
  }

  focus() {
    this.editor.focus();
  }

  scrollToBottm() {
    const model = this.editor.getModel();
    const lineCount = model.getLineCount();
    this.editor.setPosition({
      column: model.getLineLength(lineCount) + 1,
      lineNumber: lineCount,
    });

    this.editor.revealLine(lineCount);
  }

  updateMarkers(markers) {
    this.clearMarkers();
    monaco.editor.setModelMarkers(this.editor.getModel(), "swift", markers);
  }

  clearMarkers() {
    monaco.editor.setModelMarkers(this.editor.getModel(), "swift", []);
  }

  fold(foldingRanges) {
    monaco.languages.registerFoldingRangeProvider("swift", {
      provideFoldingRanges: function (model, context, token) {
        return foldingRanges;
      },
    });
    this.editor.trigger("fold", "editor.foldAll");
  }
}
