"use strict";

import { datadogLogs } from "@datadog/browser-logs";

datadogLogs.init({
  clientToken: "pubb95ad0962a0855df5160896d295fd10b",
  site: "datadoghq.com",
  service: "swiftfiddle-browser",
  forwardErrorsToLogs: true,
  sampleRate: 100,
});
