"use strict";

import "./scss/default.scss";
import "./css/embedded.css";

import { EmbedView } from "./js/embed_view.js";
new EmbedView(window.appConfig);

import "./js/icon_embed.js";
