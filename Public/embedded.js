"use strict";

import "./scss/default.scss";
import "./css/embedded.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./css/icons.css";

import { EmbedView } from "./js/embed_view.js";
new EmbedView(window.appConfig);
