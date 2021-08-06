"use strict";

import "./scss/default.scss";
import "./css/common.css";
import "./css/version_picker.css";

import { setupErrorTracking } from "./js/logger.js";
setupErrorTracking();

import { config, library, dom } from "@fortawesome/fontawesome-svg-core";
config.searchPseudoElements = true;

import {
  faCodeBranch,
  faPlay,
  faCircleNotch,
  faStop,
  faEraser,
  faAlignLeft,
  faShareAlt,
  faCog,
  faQuestion,
  faExclamationTriangle,
} from "@fortawesome/pro-solid-svg-icons";
import {
  faCheck,
  faClipboard,
  faFileImport,
  faKeyboard,
  faToolbox,
  faCommentAltSmile,
  faCheckCircle,
  faAt,
} from "@fortawesome/pro-regular-svg-icons";
import { faMonitorHeartRate } from "@fortawesome/pro-light-svg-icons";
import {
  faSwift,
  faGithub,
  faTwitter,
  faFacebookSquare,
} from "@fortawesome/free-brands-svg-icons";

library.add(
  faCodeBranch,
  faPlay,
  faCircleNotch,
  faStop,
  faEraser,
  faAlignLeft,
  faShareAlt,
  faCog,
  faQuestion,
  faExclamationTriangle,

  faCheck,
  faClipboard,
  faFileImport,
  faKeyboard,
  faToolbox,
  faCommentAltSmile,
  faCheckCircle,
  faAt,

  faMonitorHeartRate,

  faSwift,
  faGithub,
  faTwitter,
  faFacebookSquare
);
dom.watch();

import("./js/app.js").then((module) => {
  window.app = new module.App(window.appConfig);

  import("bootstrap").then((module) => {
    [].slice
      .call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
      .map((trigger) => {
        return new module.Tooltip(trigger);
      });
    import("./css/share_sheet.css").then((module) => {
      import("./js/share_sheet.js").then((module) => {
        document.getElementById("share-button").classList.remove("disabled");
      });
    });

    document.getElementById("run-button").classList.remove("disabled");
    document
      .getElementById("clear-console-button")
      .classList.remove("disabled");
    document.getElementById("format-button").classList.remove("disabled");
  });

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
});
