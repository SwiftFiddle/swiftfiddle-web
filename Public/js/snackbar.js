"use strict";

import { Toast } from "bootstrap";

const infoBlock = document.getElementById("snackbar-info");
const alertBlock = document.getElementById("snackbar-alert");

export class Snackbar {
  static info(message) {
    const messageContainer = document.getElementById("snackbar-info-message");
    messageContainer.innerText = message;
    infoBlock.classList.remove("d-none");
    new Toast(infoBlock).show();
  }

  static alert(message) {
    const messageContainer = document.getElementById("snackbar-alert-message");
    messageContainer.innerText = message;
    alertBlock.classList.remove("d-none");
    new Toast(alertBlock).show();
  }
}

if (infoBlock) {
  infoBlock.addEventListener("hidden.bs.toast", () => {
    infoBlock.classList.add("d-none");
  });
  infoBlock.addEventListener("hidden.bs.toast", () => {
    infoBlock.classList.add("d-none");
  });
}
if (alertBlock) {
  alertBlock.addEventListener("hidden.bs.toast", () => {
    alertBlock.classList.add("d-none");
  });
  alertBlock.addEventListener("hidden.bs.toast", () => {
    alertBlock.classList.add("d-none");
  });
}
