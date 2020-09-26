function showShareSheet() {
  console.log("test");
  $("#shareSheet").modal();
}

function copyShareURL() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText("link copied");
  }
  $(".share-sheet-message").text("link copied");
}
