import "./scss/index.scss";
import "./css/embedded.css";

import { App } from "./js/app";
new App(window.appConfig);

document.getElementById("run-button").classList.remove("disabled");
document.getElementById("clear-console-button").classList.remove("disabled");
