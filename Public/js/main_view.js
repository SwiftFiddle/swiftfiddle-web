"use strict";

import "../css/version_picker.css";

import { Tooltip } from "bootstrap";
import { Editor } from "./editor.js";
import { Console } from "./console.js";
import { VersionPicker } from "./version_picker.js";
import { ShareSheet } from "./share_sheet.js";
import { App } from "./app.js";
import {
  clearConsoleButton,
  formatButton,
  runButton,
  shareButton,
} from "./ui_control.js";

export class MainView {
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
        enabled: true,
      },
      minimap: {
        enabled: false,
      },
      theme: "vs-light",
      showFoldingControls: "mouseover",
    });
    this.console = new Console(document.getElementById("terminal-container"));
    this.versionPicker = new VersionPicker();
    this.shareSheet = new ShareSheet(this.editor, this.versionPicker);
    this.app = new App(this.editor, this.console, this.versionPicker);

    this.init();
  }

  init() {
    [].slice
      .call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
      .map((trigger) => {
        return new Tooltip(trigger);
      });

    runButton.classList.remove("disabled");
    clearConsoleButton.classList.remove("disabled");
    formatButton.classList.remove("disabled");
    shareButton.classList.remove("disabled");

    const settingsModal = document.getElementById("settings-modal");
    settingsModal.addEventListener("show.bs.modal", function (event) {
      const input = document.getElementById("settings-timeout");
      const timeout = window.appConfig.timeout;
      if (!timeout) {
        input.value = "";
      } else if (timeout && Number.isInteger(timeout)) {
        input.value = timeout;
      } else {
        input.value = "60";
      }

      const compilerOptions = window.appConfig.compilerOptions;
      document.getElementById("settings-compiler-options").value =
        compilerOptions;
    });

    const settingsSaveButton = document.getElementById("settings-save-button");
    settingsSaveButton.addEventListener("click", function (event) {
      const timeout = document.getElementById("settings-timeout").value;
      if (timeout && /^\+?(0|[1-9]\d*)$/.test(timeout)) {
        const integer = Number.parseInt(timeout, 10);
        if (integer && integer >= 30 && integer <= 600) {
          window.appConfig.timeout = integer;
        }
      }
      const compilerOptions = document.getElementById(
        "settings-compiler-options"
      ).value;
      window.appConfig.compilerOptions = compilerOptions;
    });
  }
}
