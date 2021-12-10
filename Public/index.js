"use strict";

import { init, trackPages } from "insights-js";
init("NeurqwdFCG9QqMWI");
trackPages();

import "./scss/default.scss";
import "./css/common.css";

import "./js/logger.js";
import "./js/icon.js";

import { MainView } from "./js/main_view.js";
new MainView(window.appConfig);
