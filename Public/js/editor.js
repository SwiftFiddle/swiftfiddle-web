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
