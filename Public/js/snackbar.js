"use strict";

import { Toast } from "bootstrap";

const infoContainerBlock = document.getElementById("snackbar-info-container");
const infoBlock = document.getElementById("snackbar-info");
const alertContainerBlock = document.getElementById("snackbar-alert-container");
const alertBlock = document.getElementById("snackbar-alert");

export class Snackbar {
  static info(message) {
    const messageContainer = document.getElementById("snackbar-info-message");
    messageContainer.textContent = message;
    infoContainerBlock.classList.remove("d-none");
    infoBlock.classList.remove("d-none");
    new Toast(infoBlock).show();
  }

  static alert(message) {
    const messageContainer = document.getElementById("snackbar-alert-message");
    messageContainer.textContent = message;
    alertContainerBlock.classList.remove("d-none");
    alertBlock.classList.remove("d-none");
    new Toast(alertBlock).show();
  }
}

if (infoBlock) {
  infoBlock.addEventListener("hidden.bs.toast", () => {
    infoContainerBlock.classList.add("d-none");
    infoBlock.classList.add("d-none");
  });
  infoBlock.addEventListener("hidden.bs.toast", () => {
    infoContainerBlock.classList.add("d-none");
    infoBlock.classList.add("d-none");
  });
}
if (alertBlock) {
  alertBlock.addEventListener("hidden.bs.toast", () => {
    alertContainerBlock.classList.add("d-none");
    alertBlock.classList.add("d-none");
  });
  alertBlock.addEventListener("hidden.bs.toast", () => {
    alertContainerBlock.classList.add("d-none");
    alertBlock.classList.add("d-none");
  });
}
