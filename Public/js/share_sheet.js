"use strict";

import { Popover } from "bootstrap";
import { VersionPicker } from "./version_picker.js";
import { Snackbar } from "./snackbar.js";
const axios = require("axios").default;

const shareButton = document.getElementById("share-button");
const popoverContent = document.getElementById("share-sheet");

if (popoverContent) {
  const placeholderData =
    "0000000000000000000000000000000000000000000000000000000000000000000000000000";

  const popover = new Popover(shareButton, {
    title: "",
    trigger: "manual",
    html: true,
    content: popoverContent,
    container: "body",
  });

  const link = document.getElementById("share-sheet-link-label");
  const linkField = document.getElementById("share-sheet-link-field");
  const linkCopyButton = document.getElementById(
    "share-sheet-link-copy-button"
  );
  const linkCopyButtonIcon = document.getElementById(
    "share-sheet-link-copy-button-icon"
  );
  const linkCopyButtonSpinner = document.getElementById(
    "share-sheet-link-copy-button-spinner"
  );
  const embed = document.getElementById("share-sheet-embed-label");
  const embedField = document.getElementById("share-sheet-embed-field");
  const embedCopyButton = document.getElementById(
    "share-sheet-embed-copy-button"
  );
  const embedCopyButtonIcon = document.getElementById(
    "share-sheet-embed-copy-button-icon"
  );
  const embedCopyButtonSpinner = document.getElementById(
    "share-sheet-embed-copy-button-spinner"
  );

  shareButton.addEventListener("show.bs.popover", () => {
    linkField.value = "";
    embedField.value = "";

    popoverContent.classList.remove("d-none");
    embed.dataset.value = placeholderData;

    linkCopyButton.classList.add("disabled");
    linkCopyButtonIcon.classList.add("d-none");
    linkCopyButtonSpinner.classList.remove("d-none");

    embedCopyButton.classList.add("disabled");
    embedCopyButtonIcon.classList.add("d-none");
    embedCopyButtonSpinner.classList.remove("d-none");

    const params = {
      toolchain_version: VersionPicker.current(),
      code: window.app.editor.getValue(),
    };
    axios
      .post("/shared_link", params)
      .then((response) => {
        if (response.data) {
          const url = response.data.url;

          link.dataset.value = url;
          linkField.value = url;
          linkCopyButton.classList.remove("disabled");

          embed.dataset.value = placeholderData;
          embedField.value = `<iframe width="100%" height="300" frameborder="0"
  src="${url}/embedded/">
</iframe>`;
          embedCopyButton.classList.remove("disabled");

          const shareTwitterButton = document.getElementById(
            "share-twitter-button"
          );
          shareTwitterButton.href = `https://twitter.com/intent/tweet?text=&url=${url}`;

          const shareFacebookButton = document.getElementById(
            "share-facebook-button"
          );
          shareFacebookButton.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        } else {
          console.error(response.statusText);
          Snackbar.alert(response.statusText);
        }
      })
      .catch((error) => {
        if (error.response) {
          console.error(error.response.statusText);
          Snackbar.alert(error.response.statusText);
        } else {
          console.error(error);
          Snackbar.alert(error);
        }
      })
      .finally(() => {
        linkCopyButtonIcon.classList.remove("d-none");
        linkCopyButtonSpinner.classList.add("d-none");

        embedCopyButtonIcon.classList.remove("d-none");
        embedCopyButtonSpinner.classList.add("d-none");
      });
  });

  shareButton.addEventListener("click", (event) => {
    popover.toggle();
    event.stopPropagation();
  });

  document.body.addEventListener("click", (event) => {
    if (event.target !== shareButton && !event.target.closest(".popover")) {
      popover.hide();
    }
  });

  linkCopyButton.addEventListener("click", (event) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(linkField.value);
      Snackbar.info("Copied!");
    }
  });

  embedCopyButton.addEventListener("click", (event) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(embedField.value);
      Snackbar.info("Copied!");
    }
  });
}
