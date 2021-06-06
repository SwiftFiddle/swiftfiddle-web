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
  tabSize: 2,
  useSoftTabs: true,
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
