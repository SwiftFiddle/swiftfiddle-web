"use strict";

ace.require("ace/lib/lang");
ace.require("ace/ext/language_tools");
const Range = ace.require("ace/range").Range;

const editor = ace.edit("editor");
editor.setTheme("ace/theme/xcode");
editor.session.setMode("ace/mode/swift");
editor.$blockScrolling = Infinity;
editor.setOptions({
  useSoftTabs: true,
  displayIndentGuides: true,
  autoScrollEditorIntoView: true,
  scrollPastEnd: 0.5, // Overscroll
  fontFamily: "Menlo,sans-serif,monospace",
  fontSize: "11pt",
  wrap: "free",
  showInvisibles: false,
  enableAutoIndent: true,
  enableBasicAutocompletion: true,
  enableSnippets: true,
  enableLiveAutocompletion: true,
});
editor.renderer.setOptions({
  showFoldWidgets: false,
  showPrintMargin: false,
});

if (!editor.completer) {
  editor.execCommand("startAutocomplete");
  editor.completer.detach();
}
editor.completer.popup.container.style.width = "30%";

const row = editor.session.getLength() - 1;
const column = editor.session.getLine(row).length;
editor.gotoLine(row + 1, column);
editor.focus();

editor.on("change", (change, editor) => {
  if (!editor.getValue()) {
    $("#run-button").prop("disabled", true);
    $("#share-button").prop("disabled", true);
  } else {
    $("#run-button").prop("disabled", false);
    $("#share-button").prop("disabled", false);
  }
});

var terminal = new Terminal({
  theme: {
    // https://ethanschoonover.com/solarized/
    brightBlack: "#002b36", // base03
    black: "#073642", // base02
    brightGreen: "#586e75", // base01
    brightYellow: "#657b83", // base00
    brightBlue: "#839496", // base0
    brightCyan: "#93a1a1", // base1
    white: "#eee8d5", // base2
    brightWhite: "#fdf6e3", // base3
    yellow: "#b58900", // yellow
    brightRed: "#cb4b16", // orange
    red: "#dc322f", // red
    magenta: "#d33682", // magenta
    brightMagenta: "#6c71c4", // violet
    blue: "#268bd2", // blue
    cyan: "#2aa198", // cyan
    green: "#859900", // green
    background: "#002b36",
    foreground: "#93a1a1",
  },
  fontFamily: "Menlo,sans-serif,monospace",
  fontSize: 16,
  lineHeight: 1.2,
  convertEol: true,
  cursorStyle: "underline",
  cursorBlink: false,
});
const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(document.getElementById("terminal"));
fitAddon.fit();

$(".selectpicker").selectpicker({
  iconBase: "fas",
  tickIcon: "fa-check",
});

$("#run-button").click(function (e) {
  e.preventDefault();
  run($(this), editor);
});

function run(sender, editor) {
  clearMarkers(editor);
  showLoading();
  const cancelToken = showSpinner(terminal, "Running");

  const params = {
    toolchain_version: $("#versionPicker").val(),
    code: editor.getValue(),
  };
  $.post("/run", params)
    .done(function (data) {
      hideSpinner(terminal, cancelToken);

      terminal.write(`\x1b[38;5;72m${data.version}\x1b[0m`);
      terminal.write(`${data.errors}\x1b[0m`);
      terminal.write(`\x1b[37m${data.output}\x1b[0m`);

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
  const matches = message.matchAll(
    /\/\[REDACTED\]\/main\.swift:(\d+):(\d+): (error|warning|note): ([\s\S]*?)\n*(?=(?:\/|$))/gi
  );
  return [...matches].map((match) => {
    return {
      row: match[1] - 1,
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
  const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let spins = 0;
  function updateSpinner(terminal, message) {
    const progressText = `${SPINNER[spins % SPINNER.length]} ${message}`;
    terminal.write("\x1b[2K\r");
    terminal.write(
      `\x1b[37m${progressText} ${".".repeat(
        Math.floor((spins * 2) / 4) % 4
      )} \x1b[0m`
    );
    spins++;
  }

  updateSpinner(terminal, message);
  return setInterval(() => {
    updateSpinner(terminal, message);
  }, 200);
}

function hideSpinner(terminal, cancelToken) {
  clearInterval(cancelToken);
  terminal.write("\x1b[2K\r");
}

function showShareSheet() {
  const code = editor.getValue();
  const params = {
    toolchain_version: $("#versionPicker").val().replace("/", "_"),
    code: code,
  };
  $.post("/shared_link", params, (data, error, xhr) => {
    if (data) {
      const url = data.url;
      $("#shared_link").val(url);
      $(".btn-facebook").attr(
        "href",
        `https://www.facebook.com/sharer/sharer.php?u=${url}`
      );
      $(".btn-twitter").attr(
        "href",
        `https://twitter.com/intent/tweet?text=&url=${url}`
      );
      $(".btn-line").attr(
        "href",
        `https://social-plugins.line.me/lineit/share?url=${url}`
      );
      $(".btn-pocket").attr("href", `https://getpocket.com/edit?url=${url}`);
      $("#shareSheet").modal();
    }
  });
  $("#shareSheet").modal();
}

function copySharedLink() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText($("#shared_link").val());
  }
  const message = $(".share-sheet-copy-message");
  message.hide();
  message.text("link copied!");
  message.fadeIn(500).delay(1000).fadeOut(500);
}

function handleFileSelect(event) {
  event.stopPropagation();
  event.preventDefault();

  const files = event.dataTransfer.files;
  const reader = new FileReader();
  reader.onload = (event) => {
    const editor = ace.edit("editor");
    editor.setValue(event.target.result);
    editor.clearSelection();
  };
  reader.readAsText(files[0], "UTF-8");
}

function handleDragOver(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

const dropZone = document.getElementById("editor");
dropZone.addEventListener("dragover", handleDragOver, false);
dropZone.addEventListener("drop", handleFileSelect, false);
