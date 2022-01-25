"use strict";

import Plausible from "plausible-tracker";

const { enableAutoPageviews } = Plausible({
  domain: "swiftfiddle.com",
});
enableAutoPageviews();

import "./scss/default.scss";
import "./css/embedded.css";

import "./js/icon_embed.js";

import { EmbedView } from "./js/embed_view.js";
new EmbedView(window.appConfig);
