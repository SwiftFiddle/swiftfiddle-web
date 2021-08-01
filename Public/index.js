import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";
Sentry.init({
  dsn: "https://56bc351f77be41d08e91bfefd51ff65c@o938512.ingest.sentry.io/5888290",
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});

import "./scss/index.scss";
import "./css/index.css";
import "./css/version_picker.css";
import "./css/share_sheet.css";
import "./js/share_sheet.js";

import("./js/app.js").then((module) => {
  new module.App(window.appConfig);
});

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

import("bootstrap").then((module) => {
  const tooltipTriggers = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggers.map((trigger) => {
    return new module.Tooltip(trigger);
  });
});
