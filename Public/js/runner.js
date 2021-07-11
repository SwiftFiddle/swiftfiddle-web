"use strict";

export class Runner {
  constructor(console) {
    this.console = console;
    this.onmessage = () => {};
  }

  run(params, completion) {
    this.connection = this.createConnection(
      webSocketEndpoint(`${params._nonce}/run`)
    );

    const startTime = performance.now();
    $.post("/run", params)
      .done((data) => {
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
          `\x1b[38;5;72m${data.version
            .split("\n")
            .map((line, i) => {
              // prettier-ignore
              const padding = this.console.cols - line.length - timestamp.length - execTime.length;
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

        const matchTimeout = data.errors.match(
          /Maximum execution time of \d+ seconds exceeded\./
        );
        if (matchTimeout) {
          buffer.push(`${data.errors.replace(matchTimeout[0], "")}\x1b[0m`);
        } else {
          buffer.push(`${data.errors}\x1b[0m`);
        }

        if (data.output) {
          buffer.push(`\x1b[37m${data.output}\x1b[0m`);
        } else {
          buffer.push(`\x1b[0m\x1b[1m*** No output. ***\x1b[0m\n`);
        }

        if (matchTimeout) {
          buffer.push(`\x1b[31;1m${matchTimeout[0]}\n`); // Timeout error message
        }

        completion(buffer, data.errors);
      })
      .fail((response) => {
        completion([]);
        alert(`[Status: ${response.status}] Something went wrong`);
      })
      .always(() => {
        this.connection.close();
        this.connection = null;
      });
  }

  createConnection(endpoint) {
    if (
      this.connection &&
      (this.connection.readyState === 0 || this.connection.readyState === 1)
    ) {
      return this.connection;
    }

    console.log(`Connecting to ${endpoint}`);
    const connection = new WebSocket(endpoint);

    connection.onopen = () => {
      console.log(`WebSocket connection opened (${connection.readyState}).`);

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
      console.log(`WebSocket connection closed (${event.code}).`);
      if (event.code !== 1006) {
        return;
      }
      setTimeout(() => {
        this.connection = this.createConnection(connection.url);
      }, 1000);
    };

    connection.onerror = (event) => {
      console.error(`WebSocket connection error (${event.message}).`);
      connection.close();
    };

    connection.onmessage = (event) => {
      this.onmessage(event.data);
    };

    return connection;
  }
}

function webSocketEndpoint(path) {
  const location = window.location;
  // prettier-ignore
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/${path}`
}
