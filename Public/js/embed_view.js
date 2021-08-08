"use strict";

import { Editor } from "./editor.js";
import { Console } from "./console.js";
import { VersionPicker } from "./version_picker.js";
import { App } from "./app.js";
import { runButton } from "./ui_control.js";

export class EmbedView {
  constructor(config) {
    this.editor = new Editor(document.getElementById("editor-container"), {
      value: config.initialText,
      fontSize: "14pt",
      lineHeight: 21,
      language: "swift",
      wordWrap: "on",
      wrappingIndent: "indent",
      tabSize: 2,
      lightbulb: {
        enabled: false,
      },
      minimap: {
        enabled: false,
      },
      theme: "vs-light",
      showFoldingControls: "mouseover",

      readOnly: true,
      renderIndentGuides: false,
      glyphMargin: false,
      lineNumbersMinChars: 4,
      lineDecorationsWidth: 6,
    });
    if (config.foldingRanges && config.foldingRanges.length) {
      this.editor.fold(config.foldingRanges);
    }
    this.console = new Console(document.getElementById("terminal-container"));
    this.versionPicker = new VersionPicker();
    this.app = new App(this.editor, this.console, this.versionPicker);
    this.init();
  }

  init() {
    runButton.classList.remove("disabled");
  }
}
