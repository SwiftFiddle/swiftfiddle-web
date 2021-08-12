"use strict";

import "./scss/default.scss";
import "./css/embedded.css";

import "./js/logger.js";
import "./js/icon_embed.js";
import { EmbedView } from "./js/embed_view.js";

new EmbedView(window.appConfig);
