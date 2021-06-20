"use strict";

export const showShareSheet = (editor) => {
  if ($("#share-sheet").is(":visible")) {
    return;
  }
  reset();
  loading();

  const code = editor.getValue();
  const params = {
    toolchain_version: $("#version-picker").val().replace("/", "_"),
    code: code,
  };
  $.post("/shared_link", params, (data, error, xhr) => {
    if (data) {
      success();

      const url = data.url;
      $("#shared-link").val(url);
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

      $("#embed-snippet").val(
        `<iframe width="100%" height="300" frameborder="0"
 src="${url}url/embedded/">
</iframe>`
      );
    } else {
      failed();
    }
  }).fail(function () {
    failed();
  });
  $("#share-sheet").modal();
};

export const copySharedLink = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText($("#shared-link").val());
  }
  const message = $("#shared-link-copy-message");
  message.hide();
  message.text("link copied!");
  message.fadeIn(500).delay(1000).fadeOut(500);
};

export const copyEmbedSnippet = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText($("#embed-snippet").val());
  }
  const message = $("#embed-snippet-copy-message");
  message.hide();
  message.text("snippet copied!");
  message.fadeIn(500).delay(1000).fadeOut(500);
};

function reset() {
  $("#shared-link").val("");
  $("#embed-snippet").val("");
  $(".shared-link-spinner").hide();
  $(".shared-link-copy-button-icon").show();
  $(".shared-link-copy-button").prop("disabled", false);
  $(".shared-link-failure").hide();
}

function loading() {
  $(".shared-link-spinner").show();
  $(".shared-link-copy-button-icon").hide();
  $(".shared-link-copy-button").prop("disabled", true);
  $(".shared-link-failure").hide();
}

function success() {
  $(".shared-link-spinner").hide();
  $(".shared-link-copy-button-icon").show();
  $(".shared-link-copy-button").prop("disabled", false);
  $(".shared-link-failure").hide();
}

function failed() {
  $(".shared-link-spinner").hide();
  $(".shared-link-copy-button-icon").hide();
  $(".shared-link-copy-button").prop("disabled", true);
  $(".shared-link-failure").show();
}
