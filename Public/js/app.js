"use strict";

$(".selectpicker").selectpicker({
  iconBase: "fas",
  tickIcon: "fa-check",
});

$("#run-button").click(function (e) {
  e.preventDefault();
  run(editor);
});

$("#terminal").mouseenter(function () {
  $("#terminal>div.toolbar").fadeTo("normal", 1);
});

$("#terminal").mouseleave(function () {
  $("#terminal>div.toolbar").fadeTo("normal", 0);
});

$("#clear-button").on("click", function (e) {
  e.preventDefault();
  terminal.clear();
});

$("#versionPicker").on("change", function () {
  if (this.value < "5.3") {
    $(".package-available").hide();
    $(".package-unavailable").show();
  } else {
    $(".package-available").show();
    $(".package-unavailable").hide();
  }
});

Terminal.cursorHide();
editor.commands.addCommand({
  name: "run",
  bindKey: { win: "Ctrl-Enter", mac: "Command+Enter" },
  exec: (editor) => {
    run(editor);
  },
});

function run(editor) {
  clearMarkers(editor);
  showLoading();

  Terminal.cursorSavePosition();
  Terminal.switchAlternateBuffer();
  Terminal.moveCursorTo(0, 0);
  const consoleBuffer = [];
  const cancelToken = Terminal.showSpinner("Running", () => {
    return consoleBuffer.filter(Boolean);
  });

  const nonce = uuidv4();
  const params = {
    toolchain_version: $("#versionPicker").val(),
    code: editor.getValue(),
    _color: true,
    _nonce: nonce,
  };

  const location = window.location;
  const connection = new WebSocket(
    // prettier-ignore
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${location.pathname}ws/${nonce}/run`
  );
  connection.onmessage = (e) => {
    consoleBuffer.length = 0;
    consoleBuffer.push(...parseMessage(e.data));
  };

  const startTime = performance.now();
  $.post("/run", params)
    .done(function (data) {
      Terminal.hideSpinner(cancelToken);
      Terminal.switchNormalBuffer();
      Terminal.cursorRestorePosition();

      const endTime = performance.now();
      const execTime = ` ${((endTime - startTime) / 1000).toFixed(0)}s`;

      const now = new Date();
      const timestamp = now.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      terminal.write(
        `\x1b[38;5;72m${data.version
          .split("\n")
          .map((line, i) => {
            const padding =
              terminal.cols - line.length - timestamp.length - execTime.length;
            let _1 = "";
            if (padding < 0) {
              _1 = `\x1b[0m\x1b[2m${timestamp}\x1b[0m${execTime}\n`;
            } else {
              _1 = "";
            }
            let _2 = "";
            if (padding >= 0) {
              _2 = `${" ".repeat(
                padding
              )}\x1b[0m\x1b[2m${timestamp}\x1b[0m${execTime}`;
            } else {
              _2 = "";
            }
            if (i == 0) {
              return `${_1}\x1b[38;5;72m\x1b[2m${line}\x1b[0m${_2}`;
            } else {
              return `\x1b[38;5;72m\x1b[2m${line}\x1b[0m`;
            }
          })
          .join("\n")}\x1b[0m`
      );

      const match = data.errors.match(
        /Maximum execution time of \d+ seconds exceeded\./
      );
      if (match) {
        terminal.write(`${data.errors.replace(match[0], "")}\x1b[0m`);
      } else {
        terminal.write(`${data.errors}\x1b[0m`);
      }

      if (data.output) {
        terminal.write(`\x1b[37m${data.output}\x1b[0m`);
      } else {
        terminal.write(`\x1b[0m\x1b[1m*** No output. ***\x1b[0m\n`);
      }

      if (match) {
        terminal.write(`\x1b[31;1m${match[0]}\n`); // Timeout error
      }

      const annotations = parceErrorMessage(data.errors);
      updateAnnotations(editor, annotations);
    })
    .fail(function (response) {
      hideSpinner(cancelToken);
      alert(`[Status: ${response.status}] Something went wrong`);
    })
    .always(function () {
      connection.close();
      hideLoading();
      editor.focus();
    });
}

function clearMarkers(editor) {
  Object.entries(editor.session.getMarkers()).forEach(([key, value]) => {
    editor.session.removeMarker(value.id);
  });
}

function parceErrorMessage(message) {
  const matches = message
    .replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    )
    .matchAll(
      /\/\[REDACTED\]\/main\.swift:(\d+):(\d+): (error|warning|note): ([\s\S]*?)\n*(?=(?:\/|$))/gi
    );
  return [...matches].map((match) => {
    return {
      row: match[1] - 1 - 4, // 4 lines of code inserted by default
      column: match[2] - 1,
      text: match[4],
      type: match[3].replace("note", "info"),
      full: match[0],
    };
  });
}

function updateAnnotations(editor, annotations) {
  editor.session.setAnnotations(annotations);

  annotations.forEach((annotation) => {
    const marker = annotation.text.match(/\^\~*/i);
    editor.session.addMarker(
      new Range(
        annotation.row,
        annotation.column,
        annotation.row,
        annotation.column + (marker ? marker[0].length : 1)
      ),
      `editor-marker-${annotation.type}`,
      "text"
    );
  });
}

function parseMessage(message) {
  const lines = [];

  const data = JSON.parse(message);
  const version = data.version;
  const stderr = data.errors;
  const stdout = data.output;

  if (version) {
    lines.push(
      ...version
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          return {
            text: `\x1b[38;5;72m\x1b[2m${line}\x1b[0m`,
            numberOfLines: Math.ceil(line.length / terminal.cols),
          };
        })
    );
  }
  if (stderr) {
    lines.push(
      ...stderr
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          return {
            text: `${line}\x1b[0m`,
            numberOfLines: Math.ceil(line.length / terminal.cols),
          };
        })
    );
  }
  if (stdout) {
    lines.push(
      ...stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          return {
            text: `\x1b[37m${line}\x1b[0m`,
            numberOfLines: Math.ceil(line.length / terminal.cols),
          };
        })
    );
  }

  return lines;
}

function showLoading() {
  $("#run-button").addClass("disabled");
  $("#run-button-text").hide();
  $("#run-button-icon").hide();
  $("#run-button-spinner").show();
}

function hideLoading() {
  $("#run-button").removeClass("disabled");
  $("#run-button-text").show();
  $("#run-button-icon").show();
  $("#run-button-spinner").hide();
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}
