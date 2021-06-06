"use strict";

$("#terminal").unbind("mouseenter");
$("#terminal").unbind("mouseleave");
$("#clear-button").unbind("click");

function showLoading() {
  $("#run-button").addClass("disabled");
  $("#run-button-icon").hide();
  $("#run-button-spinner").show();
}

function hideLoading() {
  $("#run-button").removeClass("disabled");
  $("#run-button-icon").show();
  $("#run-button-spinner").hide();
}
