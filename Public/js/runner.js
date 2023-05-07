"use strict";

import Plausible from "plausible-tracker";
const { trackEvent } = Plausible({
  domain: "swiftfiddle.com",
});

import { Snackbar } from "./snackbar.js";

import ReconnectingWebSocket from "reconnecting-websocket";

export class Runner {
  constructor(terminal) {
    this.abortController = new AbortController();
    this.terminal = terminal;
    this.onmessage = () => {};
  }

  run(params, completion) {
    if (!window.appConfig.isEmbedded) {
      this.connection = this.createConnection(
        `wss://swiftfiddle.com/runner/${params.toolchain_version}/logs/${params._nonce}`
      );
    }

    const startTime = performance.now();

    const path = `/runner/${params.toolchain_version}/run`;
    if (params.toolchain_version !== "5.8") {
      trackEvent("run", { props: { path } });
    }

    fetch(path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      signal: this.abortController.signal,
    })
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        const endTime = performance.now();
        const execTime = ` ${((endTime - startTime) / 1000).toFixed(0)}s`;

        const now = new Date();
        const timestamp = now.toLocaleString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });

        const buffer = [];
        buffer.push(
          `\x1b[38;2;127;168;183m${response.version // #7FA8B7
            .split("\n")
            .map((line, i) => {
              // prettier-ignore
              const padding = this.terminal.cols - line.length - timestamp.length - execTime.length;
              let _1 = "";
              if (padding < 0) {
                _1 = `\x1b[0m${timestamp}${execTime}\n`;
              } else {
                _1 = "";
              }
              let _2 = "";
              if (padding >= 0) {
                _2 = `${" ".repeat(padding)}\x1b[0m${timestamp}${execTime}`;
              } else {
                _2 = "";
              }
              if (i == 0) {
                return `${_1}\x1b[38;2;127;168;183m${line}\x1b[0m${_2}`; // #7FA8B7
              } else {
                return `\x1b[38;2;127;168;183m${line}\x1b[0m`; // #7FA8B7
              }
            })
            .join("\n")}\x1b[0m`
        );

        const matchTimeout = response.errors.match(
          /Maximum execution time of \d+ seconds exceeded\./
        );
        if (matchTimeout) {
          buffer.push(`${response.errors.replace(matchTimeout[0], "")}\x1b[0m`);
        } else {
          buffer.push(`${response.errors}\x1b[0m`);
        }

        if (response.output) {
          buffer.push(`\x1b[37m${response.output}\x1b[0m`);
        } else {
          buffer.push(`\x1b[0m\x1b[1m*** No output. ***\x1b[0m\n`);
        }

        if (matchTimeout) {
          buffer.push(`\x1b[31;1m${matchTimeout[0]}\n`); // Timeout error message
        }

        completion(buffer, response.errors, null);
      })
      .catch((error) => {
        const isCancel = error.name == "AbortError";
        completion([], "", error, isCancel);
        if (!isCancel) {
          if (error.response) {
            Snackbar.alert(error.response.statusText);
          } else {
            Snackbar.alert(error);
          }
        }
      })
      .finally(() => {
        if (this.connection) {
          this.connection.close();
          this.connection = null;
        }
      });
  }

  stop() {
    this.abortController.abort();
  }

  createConnection(endpoint) {
    if (
      this.connection &&
      (this.connection.readyState === WebSocket.CONNECTING ||
        this.connection.readyState === WebSocket.OPEN)
    ) {
      return this.connection;
    }

    const connection = new ReconnectingWebSocket(endpoint, [], {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 10000,
      maxRetries: Infinity,
      debug: false,
    });

    connection.onopen = () => {
      document.addEventListener("visibilitychange", () => {
        switch (document.visibilityState) {
          case "hidden":
            break;
          case "visible":
            if (this.connection) {
              this.connection = this.createConnection(connection.url);
            }
            break;
        }
      });
    };

    connection.onerror = (event) => {
      connection.close();
    };

    connection.onmessage = (event) => {
      this.onmessage(event.data);
    };

    return connection;
  }
}
