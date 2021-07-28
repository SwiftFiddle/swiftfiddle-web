"use strict";

document.querySelectorAll(".version-picker-item").forEach((listItem) => {
  listItem.addEventListener("click", (event) => {
    for (let sibling of listItem.parentNode.children) {
      sibling.classList.remove("active-tick");
    }
    listItem.classList.add("active-tick");
    document.getElementById("version-value").innerText =
      listItem.querySelector(".dropdown-item").innerText;
  });
});

export class VersionPicker {
  static current() {
    return document.getElementById("version-value").innerText;
  }
}
