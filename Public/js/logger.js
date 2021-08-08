"use strict";

import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  dsn: "https://56bc351f77be41d08e91bfefd51ff65c@o938512.ingest.sentry.io/5888290",
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});
