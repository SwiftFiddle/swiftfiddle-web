"use strict";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export class Editor {
  constructor(initialText, isEmbedded) {
    this.editor = monaco.editor.create(
      document.getElementById("editor-container"),
      {
        value: initialText,
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
      }
    );

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
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
      run: () => {
        this.onaction("share");
      },
    });

    if (isEmbedded) {
      this.editor.updateOptions({
        readOnly: true,
        renderIndentGuides: false,
        glyphMargin: false,
        lineNumbersMinChars: 4,
        lineDecorationsWidth: 6,
      });
    }

    monaco.languages.registerCompletionItemProvider("swift", {
      triggerCharacters: ["."],
      provideCompletionItems: (model, position) => {
        return this.oncompletion(position);
      },
    });

    this.onchange = () => {};
    this.onhover = () => {};
    this.oncompletion = () => {};
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
