"use strict";

$(".selectpicker").selectpicker({
  iconBase: "fas",
  tickIcon: "fa-check",
});

ace.require("ace/lib/lang");
ace.require("ace/ext/language_tools");
ace.require("ace/range").Range;

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
  scrollPastEnd: 0.5, // Overscroll
  wrap: "free",
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

const results = ace.edit("results");
results.setTheme("ace/theme/terminal");
results.session.setMode("ace/mode/text");
results.$blockScrolling = Infinity;
results.setOptions({
  readOnly: true,
  highlightActiveLine: true,
  highlightSelectedWord: false,
  autoScrollEditorIntoView: true,
  scrollPastEnd: 0.5, // Overscroll
  wrap: "free",
});
results.renderer.setOptions({
  showGutter: true,
  showPrintMargin: false,
  showInvisibles: false,
  fontFamily: "Menlo,sans-serif,monospace",
  fontSize: "11pt",
});
results.renderer.hideCursor();

define("DynHighlightRules", function (require, exports, module) {
  require("ace/lib/oop");
  const TextHighlightRules = require("ace/mode/text_highlight_rules")
    .TextHighlightRules;
  module.exports = function () {
    this.setKeywords = function (kwMap) {
      this.keywordRule.onMatch = this.createKeywordMapper(kwMap, "identifier");
    };
    this.keywordRule = {
      regex: `\.+`,
      onMatch: function () {
        return "text";
      },
    };

    this.$rules = {
      start: [
        {
          token: "string",
          start: '"',
          end: '"',
          next: [
            {
              token: "constant.language.escape.lsl",
              regex: /\\[tn"\\]/,
            },
          ],
        },
        this.keywordRule,
      ],
    };
    this.normalizeRules();
  };
  module.exports.prototype = TextHighlightRules.prototype;
});

$("#run-button").click(function (e) {
  e.preventDefault();
  run($(this), editor);
});

function run(sender, editor) {
  results.setValue("");

  showLoading();
  const progressInterval = showSpinner(results, "Running...");

  const code = editor.getValue();
  const params = {
    toolchain_version: $("#versionPicker").val().replace("/", "_"),
    code: code,
  };

  $.post("/run", params)
    .done(function (data) {
      results.setValue(data.version + data.errors + data.output);
      updateHighlightRules(results, data.version, data.errors);
      results.clearSelection();
    })
    .fail(function (response) {
      alert(`[Status: ${response.status}] Something went wrong`);
    })
    .always(function () {
      hideLoading();
      clearInterval(progressInterval);
      editor.focus();
    });
}

function updateHighlightRules(editor, systemText, errorText) {
  require(["ace/ace", "DynHighlightRules"], function (ace) {
    const TextMode = require("ace/mode/text").Mode;
    const dynamicMode = new TextMode();
    dynamicMode.$id = "DynHighlightRules";
    dynamicMode.HighlightRules = require("DynHighlightRules");
    editor.session.setMode(dynamicMode);
    dynamicMode.$highlightRules.setKeywords({
      "compiler.message": (systemText || "").split("\n").join("|"),
      "compiler.error": (errorText || "").split("\n").join("|"),
    });
    editor.session.bgTokenizer.start(0);
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

function showSpinner(editor, message) {
  const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let spins = 0;
  function updateSpinner(editor, message) {
    const progressText = `${SPINNER[spins % SPINNER.length]}`;
    editor.setValue(progressText);
    editor.clearSelection();
    spins++;
  }

  updateSpinner(editor, message);
  return setInterval(() => {
    updateSpinner(editor, message);
  }, 200);
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
