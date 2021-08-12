"use strict";

import("./js/logger.js");

import "./scss/default.scss";
import "./css/embedded.css";

import "./js/icon_embed.js";

import("./js/embed_view.js").then((module) => {
  new module.EmbedView(window.appConfig);
});
