function hideAssets() {
  const elements = document.querySelectorAll(".tree-item-title");
  console.log("Found elements:", elements);

  for (const el of elements) {
    if (el.innerHTML.includes("assets")) {
      el.style = "display: none !important;";
      console.log("Hiding assets elements");
    }
  }
}

function addMenuButton() {
  const menu = document.createElement("div");
  menu.className = "custom-menu";

  menu.innerHTML = `
    <a href="./inventory.html"><button>Inventory Manager</button></a>
  `;
  document.body.prepend(menu);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");
  hideAssets();
  addMenuButton();
});
