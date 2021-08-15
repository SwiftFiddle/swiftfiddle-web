"use strict";

let instance = null;

export class VersionPicker {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;

    this.onchange = () => {};

    document.querySelectorAll(".version-picker-item").forEach((listItem) => {
      listItem.addEventListener("click", (event) => {
        for (let sibling of listItem.parentNode.children) {
          sibling.classList.remove("active-tick");
        }
        listItem.classList.add("active-tick");

        const version = listItem.querySelector(".dropdown-item").textContent;
        document.getElementById("version-value").textContent = version;

        this.onchange(version);
      });
    });
  }

  get selected() {
    return document.getElementById("version-value").textContent;
  }

  set selected(version) {
    document.getElementById("version-value").textContent = version;
    for (let listItem of document.querySelectorAll(".version-picker-item")) {
      if (listItem.querySelector(".dropdown-item").textContent === version) {
        listItem.click();
        return;
      }
    }
  }
}
