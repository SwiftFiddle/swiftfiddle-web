"use strict";

import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  dsn: "https://10dcc4b009c04a92a75c9b0e20a399ac@o1088427.ingest.sentry.io/6103347",
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});
