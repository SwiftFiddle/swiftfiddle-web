import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";
Sentry.init({
  dsn: "https://56bc351f77be41d08e91bfefd51ff65c@o938512.ingest.sentry.io/5888290",
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});

import { library, dom } from "@fortawesome/fontawesome-svg-core";

import {
  faCodeBranch,
  faPlay,
  faCircleNotch,
  faExternalLinkAlt,
} from "@fortawesome/pro-solid-svg-icons";

library.add(faCodeBranch, faPlay, faCircleNotch, faExternalLinkAlt);
dom.watch();

import "./scss/index.scss";
import "./css/embedded.css";

import { App } from "./js/app";
new App(window.appConfig);

document.getElementById("run-button").classList.remove("disabled");
