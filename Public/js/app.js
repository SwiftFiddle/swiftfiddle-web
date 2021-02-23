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

function run(editor) {
  clearMarkers(editor);
  showLoading();
  const cancelToken = showSpinner(terminal, "Running");

  const params = {
    toolchain_version: $("#versionPicker").val(),
    code: editor.getValue(),
    _color: true,
  };

  const startTime = performance.now();
  $.post("/run", params)
    .done(function (data) {
      const endTime = performance.now();
      const execTime = ` ${((endTime - startTime) / 1000).toFixed(0)}s`;

      hideSpinner(terminal, cancelToken);

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
          .map((l, i) => {
            return i == 0
              ? `${
                  terminal.cols -
                    l.length -
                    timestamp.length -
                    execTime.length <
                  0
                    ? `\x1b[0m\x1b[2m${timestamp}\x1b[0m${execTime}\n`
                    : ""
                }\x1b[38;5;72m\x1b[2m${l}\x1b[0m${
                  terminal.cols -
                    l.length -
                    timestamp.length -
                    execTime.length >=
                  0
                    ? `${" ".repeat(
                        terminal.cols -
                          l.length -
                          timestamp.length -
                          execTime.length
                      )}\x1b[0m\x1b[2m${timestamp}\x1b[0m${execTime}`
                    : ""
                }`
              : `\x1b[38;5;72m\x1b[2m${l}\x1b[0m`;
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
        terminal.write(`\x1b[31;1m${match[0]}\n`);
      }

      const annotations = parceErrorMessage(data.errors);
      updateAnnotations(editor, annotations);
    })
    .fail(function (response) {
      hideSpinner(terminal, cancelToken);
      alert(`[Status: ${response.status}] Something went wrong`);
    })
    .always(function () {
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
      row: match[1] - 1 - 6, // 6 lines of code inserted by default
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

function showSpinner(terminal, message) {
  const interval = 200;
  const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let spins = 0;
  function updateSpinner(terminal, message) {
    const progressText = `${SPINNER[spins % SPINNER.length]} ${message}`;
    terminal.write("\x1b[2K\r"); // Clear current line
    const dotCount = Math.floor((spins * 2) / 4) % 4;
    const animationText = `${progressText} ${".".repeat(dotCount)}`;
    const seconds = `${Math.floor(spins / 5)}s`;
    const speces = " ".repeat(
      terminal.cols - animationText.length - seconds.length
    );
    terminal.write(`\x1b[37m${animationText}\x1b[0m${speces}${seconds}`);
    spins++;
  }

  updateSpinner(terminal, message);
  return setInterval(() => {
    updateSpinner(terminal, message);
  }, interval);
}

function hideSpinner(terminal, cancelToken) {
  clearInterval(cancelToken);
  terminal.write("\x1b[2K\r");
}
