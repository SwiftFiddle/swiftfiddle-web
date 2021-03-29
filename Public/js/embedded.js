"use strict";

ace.require("ace/lib/lang");

const editor = ace.edit("editor");
editor.setTheme("ace/theme/xcode");
editor.session.setMode("ace/mode/swift");
editor.$blockScrolling = Infinity;
editor.setOptions({
  useSoftTabs: true,
  displayIndentGuides: false,
  autoScrollEditorIntoView: true,
  scrollPastEnd: false,
  fontFamily: "Menlo,Consolas,sans-serif,monospace",
  fontSize: "11pt",
  wrap: "free",
  showInvisibles: false,
  enableAutoIndent: true,
  readOnly: true,
  highlightActiveLine: false,
  highlightSelectedWord: false,
});
editor.renderer.setOptions({
  showFoldWidgets: false,
  showPrintMargin: false,
  highlightGutterLine: false,
});

editor.renderer.$cursorLayer.element.style.display = "none";

const row = editor.session.getLength() - 1;
const column = editor.session.getLine(row).length;
editor.gotoLine(row + 1, column);
editor.focus();

const terminal = new Terminal({
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
  fontFamily: "Menlo,Consolas,sans-serif,monospace",
  fontSize: 16,
  lineHeight: 1.2,
  convertEol: true,
  cursorStyle: "underline",
  cursorBlink: false,
  scrollback: 100000,
});

const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(document.getElementById("terminal"));
fitAddon.fit();

$("#terminal").unbind("mouseenter");
$("#terminal").unbind("mouseleave");
$("#clear-button").unbind("click");

function showLoading() {
  $("#run-button").addClass("disabled");
  $("#run-button-icon").hide();
  $("#run-button-spinner").show();
}

function hideLoading() {
  $("#run-button").removeClass("disabled");
  $("#run-button-icon").show();
  $("#run-button-spinner").hide();
}
