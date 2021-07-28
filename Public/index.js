import "./scss/index.scss";
import "./css/index.css";
import "./css/version_picker.css";
import "./css/share_sheet.css";
import "./js/share_sheet.js";

import { Tooltip } from "bootstrap";

import { App } from "./js/app";
new App(window.appConfig);

document.getElementById("run-button").classList.remove("disabled");
document.getElementById("clear-console-button").classList.remove("disabled");
document.getElementById("format-button").classList.remove("disabled");
document.getElementById("share-button").classList.remove("disabled");

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
  document.getElementById("settings-compiler-options").value = compilerOptions;
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

const tooltipTriggers = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
tooltipTriggers.map((trigger) => {
  return new Tooltip(trigger);
});
