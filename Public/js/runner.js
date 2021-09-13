"use strict";

import { datadogLogs } from "@datadog/browser-logs";
import { Snackbar } from "./snackbar.js";

export class Runner {
  constructor(terminal) {
    this.abortController = new AbortController();
    this.terminal = terminal;
    this.onmessage = () => {};
  }

  run(params, completion) {
    this.connection = this.createConnection(
      `wss://swiftfiddle.com/runner/${params.toolchain_version}/logs/${params._nonce}`
    );

    const startTime = performance.now();

    const path = `/runner/${params.toolchain_version}/run`;
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
          `\x1b[38;5;72m${response.version
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
                return `${_1}\x1b[38;5;156m\x1b[2m${line}\x1b[0m${_2}`;
              } else {
                return `\x1b[38;5;156m\x1b[2m${line}\x1b[0m`;
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
          datadogLogs.logger.error(`${path}`, error);
        }
      })
      .finally(() => {
        this.connection.close();
        this.connection = null;
      });
  }

  stop() {
    this.abortController.abort();
  }

  createConnection(endpoint) {
    if (
      this.connection &&
      (this.connection.readyState === 0 || this.connection.readyState === 1)
    ) {
      return this.connection;
    }

    const connection = new WebSocket(endpoint);

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

    connection.onclose = (event) => {
      if (event.code !== 1006) {
        return;
      }
      setTimeout(() => {
        this.connection = this.createConnection(connection.url);
      }, 1000);
    };

    connection.onerror = (event) => {
      datadogLogs.logger.error("runner websocket error", event);
      connection.close();
    };

    connection.onmessage = (event) => {
      this.onmessage(event.data);
    };

    return connection;
  }
}
