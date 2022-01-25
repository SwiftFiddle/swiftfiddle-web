"use strict";

import Plausible from "plausible-tracker";

const { enableAutoPageviews } = Plausible({
  domain: "swiftfiddle.com",
});
enableAutoPageviews();

import "./scss/default.scss";
import "./css/common.css";

import "./js/icon.js";

import { MainView } from "./js/main_view.js";
new MainView(window.appConfig);
