"use strict";

import "./scss/default.scss";
import "./css/common.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./css/icons.css";

import { MainView } from "./js/main_view.js";
new MainView(window.appConfig);
