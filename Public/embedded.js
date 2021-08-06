"use strict";

import "./scss/default.scss";
import "./css/embedded.css";

import { setupErrorTracking } from "./js/logger.js";
setupErrorTracking();

import { library, dom } from "@fortawesome/fontawesome-svg-core";

import {
  faCodeBranch,
  faPlay,
  faCircleNotch,
  faExternalLinkAlt,
} from "@fortawesome/pro-solid-svg-icons";

library.add(faCodeBranch, faPlay, faCircleNotch, faExternalLinkAlt);
dom.watch();

import("./js/app.js").then((module) => {
  window.app = new module.App(window.appConfig);
  document.getElementById("run-button").classList.remove("disabled");
});
