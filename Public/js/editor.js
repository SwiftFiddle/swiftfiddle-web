"use strict";

$(".selectpicker").selectpicker({
  iconBase: "fas",
  tickIcon: "fa-check",
});

const lang = ace.require("ace/lib/lang");
const langTools = ace.require("ace/ext/language_tools");

const editor = ace.edit("editor");
editor.setTheme("ace/theme/xcode");
editor.session.setMode("ace/mode/swift");
editor.$blockScrolling = Infinity;
editor.setOptions({
  useSoftTabs: true,
  autoScrollEditorIntoView: true,
  fontFamily: "Menlo,sans-serif,monospace",
  fontSize: "11pt",
  showInvisibles: false,
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

const resultsEditor = ace.edit("results-editor");
resultsEditor.setTheme("ace/theme/terminal");
resultsEditor.session.setMode("ace/mode/text");
resultsEditor.$blockScrolling = Infinity;
resultsEditor.setOptions({
  readOnly: true,
  highlightActiveLine: false,
  highlightSelectedWord: false,
  autoScrollEditorIntoView: true,
});
resultsEditor.renderer.setOptions({
  showGutter: false,
  showPrintMargin: false,
  showInvisibles: false,
  fontFamily: "Menlo,sans-serif,monospace",
  fontSize: "11pt",
});
resultsEditor.renderer.hideCursor();

$("#run-button").click(function (e) {
  e.preventDefault();
  run($(this), editor);
});

function run(sender, editor) {
  const buttonTitle = deactivate(sender);
  const intid = showProgress(resultsEditor);
  const code = editor.getValue();
  const params = {
    toolchain_version: $("#versionPicker").val().replace("/", "_"),
    code: code,
  };

  $.post("/run", params)
    .done(function (data, xhr) {
      resultsEditor.setValue(data.version + data.errors + data.output);
      resultsEditor.clearSelection();
    })
    .fail(function (response) {
      alert(`[Status: ${response.status}] Something went wrong`);
    })
    .always(function () {
      clearInterval(intid);
      editor.focus();
      activate(sender, buttonTitle);
    });
}

function activate(button, buttonTitle) {
  button.prop("disabled", false);
  button.html(buttonTitle);
}

function deactivate(button) {
  button.prop("disabled", true);
  var buttonTitle = button.html();
  button.html(
    '<i class="fa fa-circle-o-notch fa-spin" aria-hidden="true"></i> Processing...'
  );
  resultsEditor.setValue("");
  return buttonTitle;
}

function showProgress(editor) {
  let counter = 0;
  return setInterval(() => {
    if (counter == 0) {
      resultsEditor.setValue("Executing...");
      counter += 1;
    } else {
      resultsEditor.setValue(resultsEditor.getValue() + ".");
    }
    resultsEditor.clearSelection();
  }, 1500);
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
