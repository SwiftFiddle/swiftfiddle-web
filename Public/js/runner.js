"use strict";

import { TextLineStream } from "./textlinesteam.js";

export class Runner {
  constructor(terminal) {
    this.abortController = new AbortController();
    this.terminal = terminal;
    this.onmessage = () => {};
  }

  async run(params) {
    const cancelToken = this.terminal.showSpinner("Running");

    this.terminal.hideCursor();

    try {
      const version = params.toolchain_version;
      const path = (() => {
        switch (version) {
          case "nightly-5.3":
          case "nightly-5.4":
          case "nightly-5.5":
          case "nightly-5.6": {
            const suffix = version.split(".").join("").split("-").join("");
            return `https://runner-functions-${suffix}.blackwater-cac8eec1.westus2.azurecontainerapps.io/runner/${version}/run`;
          }
          case "2.2":
          case "2.2.1":
          case "3.0":
          case "3.0.1":
          case "3.0.2":
          case "3.1":
          case "3.1.1":
          case "4.0":
          case "4.0.2":
          case "4.0.3":
          case "4.1":
          case "4.1.1":
          case "4.1.2":
          case "4.1.3":
          case "4.2":
          case "4.2.1":
          case "4.2.2":
          case "4.2.3":
          case "4.2.4":
          case "5.0":
          case "5.0.1":
          case "5.0.2":
          case "5.0.3":
          case "5.1":
          case "5.1.1":
          case "5.1.2":
          case "5.1.3":
          case "5.1.4":
          case "5.1.5":
          case "5.2":
          case "5.2.1":
          case "5.2.2":
          case "5.2.3":
          case "5.2.4":
          case "5.2.5":
          case "5.9.2": {
            const suffix = version.split(".").join("");
            return `https://swiftfiddle-runner-functions-${suffix}.blackwater-cac8eec1.westus2.azurecontainerapps.io/runner/${version}/run`;
          }

          default:
            return `/runner/${version}/run`;
        }
      })();

      params._streaming = true;
      const response = await fetch(path, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        signal: this.abortController.signal,
      });

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .getReader();
      let result = await reader.read();

      this.terminal.hideSpinner(cancelToken);
      this.printTimestamp();

      if (!response.ok) {
        this.terminal.writeln(
          `\x1b[37m❌  ${response.status} ${response.statusText}\x1b[0m`
        );
        this.terminal.hideSpinner(cancelToken);
      }

      const markers = [];
      while (!result.done) {
        const value = result.value;
        if (value) {
          const response = JSON.parse(value);
          switch (response.kind) {
            case "stdout":
              response.text
                .split("\n")
                .filter(Boolean)
                .forEach((line) => {
                  this.terminal.writeln(`\x1b[37m${line}\x1b[0m`);
                });
              break;
            case "stderr":
              response.text
                .split("\n")
                .filter(Boolean)
                .forEach((line) => {
                  this.terminal.writeln(`\x1b[2m\x1b[37m${line}\x1b[0m`);
                });
              markers.push(...parseErrorMessage(response.text));
              break;
            case "version":
              response.text
                .split("\n")
                .filter(Boolean)
                .forEach((line) => {
                  this.terminal.writeln(`\x1b[38;2;127;168;183m${line}\x1b[0m`); // #7FA8B7
                });
              break;
            default:
              break;
          }
        }
        result = await reader.read();
      }

      return markers;
    } catch (error) {
      this.terminal.hideSpinner(cancelToken);
      this.terminal.writeln(`\x1b[37m❌  ${error}\x1b[0m`);
    } finally {
      this.terminal.showCursor();
    }
  }

  stop() {
    this.abortController.abort();
  }

  printTimestamp() {
    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const padding = this.terminal.cols - timestamp.length;
    this.terminal.writeln(
      `\x1b[2m\x1b[38;5;15;48;5;238m${" ".repeat(padding)}${timestamp}\x1b[0m`
    );
  }
}

function parseErrorMessage(message) {
  const matches = message
    .replace(
      // Remove all ANSI colors/styles from strings
      // https://stackoverflow.com/a/29497680/1733883
      // https://github.com/chalk/ansi-regex/blob/main/index.js#L3
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    )
    .matchAll(
      /<stdin>:(\d+): (error|warning|note): ([\s\S]*?)\n*(?=(?:\/|$))/gi
    );
  return [...matches].map((match) => {
    const row = +match[1];
    let column = +match[2];
    const text = match[4];
    const type = match[3];
    let severity;
    switch (type) {
      case "warning":
        severity = 4; // monaco.MarkerSeverity.Warning;
        break;
      case "error":
        severity = 8; // monaco.MarkerSeverity.Error;
        break;
      default: // monaco.MarkerSeverity.Info;
        severity = 2;
        break;
    }

    let length;
    if (text.match(/~+\^~+/)) {
      // ~~~^~~~
      length = text.match(/~+\^~+/)[0].length;
      column -= text.match(/~+\^/)[0].length - 1;
    } else if (text.match(/\^~+/)) {
      // ^~~~
      length = text.match(/\^~+/)[0].length;
    } else if (text.match(/~+\^/)) {
      // ~~~^
      length = text.match(/~+\^/)[0].length;
      column -= length - 1;
    } else if (text.match(/\^/)) {
      // ^
      length = 1;
    }

    return {
      startLineNumber: row,
      startColumn: column,
      endLineNumber: row,
      endColumn: column + length,
      message: text,
      severity: severity,
    };
  });
}
