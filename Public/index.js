"use strict";

import("./js/logger.js");

import "./scss/default.scss";
import "./css/common.css";

import "./js/icon.js";

import("./js/main_view.js").then((module) => {
  new module.MainView(window.appConfig);
});
