// Constants for core game mechanics
const SHAPE_EDITOR_SIZE = 20; // Changed to 20x20 grid for item shape creation
const INITIAL_ITEM_CELL_SIZE_PX = 18; // Fixed cell size for items in "Available Items" list
const WEIGHT_PER_SQUARE = 0.5; // Weight of each occupied square in lbs
const MIN_ITEM_NAME_VISIBILITY_PX = 50; // Minimum pixel dimension (width or height) for item name to be visible
const APPS_SCRIPT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzg16i7WdN9G_VnzTUNHpK_E3AU7-SXmowx9Zj3XyP-TqQZi5EYRFgagRcooI0ZHrQDNw/exec"; // Hardcoded URL

// D&D 5e Carrying Capacity Multipliers (simplified for normal carrying capacity)
const CREATURE_SIZE_MULTIPLIERS = {
  Tiny: 0.5,
  Small: 1,
  Medium: 1,
  Large: 2,
  Huge: 4,
  Gargantuan: 8,
};

// Encumbrance rules multipliers (D&D 5e simplified)
const ENCUMBERED_MULTIPLIER = 5;
const HEAVILY_ENCUMBERED_MULTIPLIER = 10;
const MAX_LOGICAL_GRID_SIDE = 50; // Cap for the *logical* number of rows/cols to prevent excessively large grids internally

// Global State Variables
let availableItems = [];
// New multi-backpack state
let backpacksMeta = []; // [{ id: 'uuid', name: 'Backpack 1' }]
let allBackpacksData = {}; // { 'uuid': { placedItems: [], strengthScore: 10, creatureSize: 'Medium', copperPieces: 0, ... } }
let currentBackpackId = null;

// These will now represent the *current* active backpack's data
let placedItems = []; // This will be a REFERENCE to allBackpacksData[currentBackpackId].placedItems
let copperPieces = 0;
let silverPieces = 0;
let goldPieces = 0;
let platinumPieces = 0;

let currentMaxWeight = 0;
let encumberedThreshold = 0;
let heavilyEncumberedThreshold = 0;
let dynamicBackpackRows = 1;
let dynamicBackpackCols = 1;
let currentSearchQuery = "";
let currentFilterCategory = "All";

// Drag and Drop State
let draggingItem = null; // { itemId, instanceId, shape, width, height, color }
let dragOffset = { x: 0, y: 0 };
let isDraggingFromBackpack = false;
let originalPlacedItemPosition = null;
let lastHoveredCell = { row: -1, col: -1 };
let isPhysicalOverlapValid = true;
let droppedInBackpackArea = false;
let dragEvent = null;

// Item Creator State
let currentShapeEditorShape = Array(SHAPE_EDITOR_SIZE)
  .fill(null)
  .map(() => Array(SHAPE_EDITOR_SIZE).fill(0));
const mainEditorState = { isDrawing: false, drawingValue: 0 };

// Context Menu State
let contextMenuItemInstanceId = null; // For items in backpack
let contextMenuAvailableItemId = null; // For items in available list
let currentEditCallback = null;
let currentConfirmCallback = null; // NEW: For confirmation modal

// Shape Edit Modal State (NEW)
let currentShapeEditModalShape = Array(SHAPE_EDITOR_SIZE)
  .fill(null)
  .map(() => Array(SHAPE_EDITOR_SIZE).fill(0));
let editingItemId = null; // Stores the ID of the item being edited
const shapeEditModalState = { isDrawing: false, drawingValue: 0 };

// DOM Elements
const itemCreatorForm = document.getElementById("item-creator-form");
const itemNameInput = document.getElementById("itemName");
const itemACInput = document.getElementById("itemAc");
const itemDamageInput = document.getElementById("itemDamage");
const itemDescriptionInput = document.getElementById("itemDescription");
const itemImageUrlInput = document.getElementById("itemImageUrl");
const itemBaseWeightInput = document.getElementById("itemBaseWeight");
const itemPriceCPInput = document.getElementById("itemPriceCP");
const itemPriceSPInput = document.getElementById("itemPriceSP");
const itemPriceGPInput = document.getElementById("itemPriceGP");
const itemPricePPInput = document.getElementById("itemPricePP");

const shapeEditor = document.getElementById("shape-editor");
const clearShapeBtn = document.getElementById("clearShapeBtn");
const fillShapeBtn = document.getElementById("fillShapeBtn");
const availableItemsList = document.getElementById("available-items-list");
const backpackGridContainer = document.getElementById(
  "backpack-grid-container"
);
const placedItemsList = document.getElementById("placed-items-list");
const copperPiecesInput = document.getElementById("copperPieces");
const silverPiecesInput = document.getElementById("silverPieces");
const goldPiecesInput = document.getElementById("goldPieces");
const platinumPiecesInput = document.getElementById("platinumPieces");
const totalWeightSpan = document.getElementById("total-weight");
const maxWeightSpan = document.getElementById("max-weight");
const encumbranceStatusSpan = document.getElementById("encumbrance-status");
const normalThresholdSpan = document.getElementById("normal-threshold");
const encumberedThresholdStartSpan = document.getElementById(
  "encumbered-threshold-start"
);
const encumberedThresholdEndSpan = document.getElementById(
  "encumbered-threshold-end"
);
const heavilyEncumberedThresholdStartSpan = document.getElementById(
  "heavily-encumbered-threshold-start"
);
const heavilyEncumberedThresholdEndSpan = document.getElementById(
  "heavily-encumbered-threshold-end"
);
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const exportModal = document.getElementById("exportModal");
const importModal = document.getElementById("importModal");
const exportDataTextarea = document.getElementById("export-data-textarea");
const importDataTextarea = document.getElementById("import-data-textarea");
const closeExportModalBtn = document.getElementById("closeExportModalBtn");
const cancelImportModalBtn = document.getElementById("cancelImportModalBtn");
const confirmImportBtn = document.getElementById("confirmImportBtn");
const alertMessageBox = document.getElementById("alertMessageBox");
const alertMessageText = document.getElementById("alertMessageText");
const dragPreviewElement = document.getElementById("drag-preview");
const toggleCreatorBtn = document.getElementById("toggle-creator-btn");
const toggleCreatorIcon = toggleCreatorBtn.querySelector(".collapse-icon");
const itemTooltip = document.getElementById("item-tooltip");
const encumbranceLabelsDiv = document.getElementById("encumbrance-labels");
const itemSearchInput = document.getElementById("itemSearchInput");
const itemCategoryFilter = document.getElementById("itemCategoryFilter");

// New DOM elements for collapsing the left pane
const leftPane = document.getElementById("left-pane");
const toggleLeftPaneMainBtn = document.getElementById(
  "toggle-left-pane-main-btn"
);
const toggleLeftPaneMainIcon = toggleLeftPaneMainBtn.querySelector("svg");

// Context Menu Elements
const itemContextMenu = document.getElementById("item-context-menu");
const contextDeleteBtn = document.getElementById("context-delete-btn");
const contextEditNameBtn = document.getElementById("context-edit-name-btn");
const contextEditACBtn = document.getElementById("context-edit-ac-btn");
const contextEditDamageBtn = document.getElementById("context-edit-damage-btn");
const contextEditDescriptionBtn = document.getElementById(
  "context-edit-description-btn"
);
const contextEditRotationBtn = document.getElementById(
  "context-edit-rotate-btn"
);
const contextEditPriceBtn = document.getElementById("context-edit-price-btn");
const contextEditShapeBtn = document.getElementById("context-edit-shape-btn");
const contextEditColorBtn = document.getElementById("context-edit-color-btn");

// Generic Edit Modal Elements
const editModal = document.getElementById("editModal");
const editModalTitle = document.getElementById("editModalTitle");
const editModalInput = document.getElementById("editModalInput");
const editModalTextarea = document.getElementById("editModalTextarea");
const editModalColorInput = document.getElementById("editModalColorInput");
const editModalPriceFields = document.getElementById("editModalPriceFields");
const editPriceCP = document.getElementById("editPriceCP");
const editPriceSP = document.getElementById("editPriceSP");
const editPriceGP = document.getElementById("editPriceGP");
const editPricePP = document.getElementById("editPricePP");
const cancelEditModalBtn = document.getElementById("cancelEditModalBtn");
const confirmEditModalBtn = document.getElementById("confirmEditModalBtn");

// Shape Edit Modal Elements
const shapeEditModal = document.getElementById("shapeEditModal");
const shapeEditEditor = document.getElementById("shape-edit-editor");
const clearShapeEditBtn = document.getElementById("clearShapeEditBtn");
const fillShapeEditBtn = document.getElementById("fillShapeEditBtn");
const itemEditBaseWeightInput = document.getElementById("itemEditBaseWeight");
const cancelShapeEditModalBtn = document.getElementById(
  "cancelShapeEditModalBtn"
);
const confirmShapeEditBtn = document.getElementById("confirmShapeEditBtn");

// Google Sheet Integration DOM Elements
const saveToSheetBtn = document.getElementById("saveToSheetBtn");
const loadFromSheetBtn = document.getElementById("loadFromSheetBtn");
const saveToSheetBtnText = document.getElementById("saveToSheetBtnText");
const loadFromSheetBtnText = document.getElementById("loadFromSheetBtnText");
const saveToSheetLoading = document.getElementById("saveToSheetLoading");
const loadFromSheetLoading = document.getElementById("loadFromSheetLoading");

// Backpack Management DOM Elements
const backpackSelector = document.getElementById("backpackSelector");
const deleteCurrentBackpackBtn = document.getElementById(
  "deleteCurrentBackpackBtn"
);
const renameBackpackBtn = document.getElementById("renameBackpackBtn"); // NEW
const clearBackpackBtn = document.getElementById("clearBackpackBtn"); // NEW
const backpackThemeSelector = document.getElementById("backpackThemeSelector");
const toggleSettingsHeader = document.getElementById("toggle-settings-header");
const allSettingsContent = document.getElementById("all-settings-content");

// New Backpack Creator DOM Elements
const backpackCreatorForm = document.getElementById("backpack-creator-form");
const toggleBackpackCreatorBtn = document.getElementById(
  "toggle-backpack-creator-btn"
);

const newBackpackNameInput = document.getElementById("newBackpackName");
const newBackpackStrengthSelect = document.getElementById(
  "newBackpackStrength"
);
const newBackpackSizeSelect = document.getElementById("newBackpackSize");

// Current Backpack Stats DOM Elements (NEW)
const currentStrengthScoreSelect = document.getElementById(
  "currentStrengthScore"
);
const currentCreatureSizeSelect = document.getElementById(
  "currentCreatureSize"
);

// Confirmation Modal DOM Elements
const confirmModal = document.getElementById("confirmModal");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const cancelConfirmModalBtn = document.getElementById("cancelConfirmModalBtn");
const confirmModalBtn = document.getElementById("confirmModalBtn");

// --- Utility Functions ---
function generateUniqueId() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

function getTrimmedShape(shapeMatrix) {
  // Use SHAPE_EDITOR_SIZE for iteration, not a hardcoded 10
  let minRow = SHAPE_EDITOR_SIZE,
    maxRow = -1,
    minCol = SHAPE_EDITOR_SIZE,
    maxCol = -1;
  let isEmpty = true;

  for (let r = 0; r < SHAPE_EDITOR_SIZE; r++) {
    for (let c = 0; c < SHAPE_EDITOR_SIZE; c++) {
      if (shapeMatrix[r][c] === 1) {
        isEmpty = false;
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  if (isEmpty) {
    return { shape: [[1]], width: 1, height: 1, occupiedCells: 1 }; // Default to 1x1 if empty
  }

  const trimmedHeight = maxRow - minRow + 1;
  const trimmedWidth = maxCol - minCol + 1;
  const trimmedShape = Array(trimmedHeight)
    .fill(null)
    .map(() => Array(trimmedWidth).fill(0));
  let occupiedCells = 0;

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      trimmedShape[r - minRow][c - minCol] = shapeMatrix[r][c];
      if (shapeMatrix[r][c] === 1) {
        occupiedCells++;
      }
    }
  }
  return {
    shape: trimmedShape,
    width: trimmedWidth,
    height: trimmedHeight,
    occupiedCells: occupiedCells,
  };
}

function rotateShape(shapeMatrix) {
  const rows = shapeMatrix.length;
  const cols = shapeMatrix[0].length;
  const rotated = Array(cols)
    .fill(null)
    .map(() => Array(rows).fill(0));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shapeMatrix[r][c];
    }
  }
  return rotated;
}

function formatPrice(price) {
  if (!price) return "0 CP";
  let parts = [];
  if (price.pp > 0) parts.push(`${price.pp} PP`);
  if (price.gp > 0) parts.push(`${price.gp} GP`);
  if (price.sp > 0) parts.push(`${price.sp} SP`);
  if (price.cp > 0) parts.push(`${price.cp} CP`);
  return parts.length > 0 ? parts.join(", ") : "0 CP";
}

// --- Alert Message Box Functions ---
function showAlert(message) {
  alertMessageText.textContent = message;
  alertMessageBox.classList.remove("hidden");
  alertMessageBox.classList.remove("alert-fade-leave-to");
  alertMessageBox.classList.add("alert-fade-enter-active");

  setTimeout(() => {
    alertMessageBox.classList.remove("alert-fade-enter-active");
    alertMessageBox.classList.add("alert-fade-leave-active");
    setTimeout(() => {
      alertMessageBox.classList.add("hidden");
      alertMessageBox.classList.remove("alert-fade-leave-active");
      alertMessageBox.classList.add("alert-fade-leave-to");
    }, 300); // Match CSS transition duration
  }, 3000);
}

// --- Tooltip Functions ---
function hideTooltip() {
  itemTooltip.classList.remove("visible");
  itemTooltip.classList.add("hidden");
}

function showTooltip() {
  itemTooltip.classList.add("visible");
  itemTooltip.classList.remove("hidden");
}

let previousElement = null;
function renderTooltip(event, item, itemDiv) {
  const weight =
    item.shape.flat().filter((c) => c === 1).length * WEIGHT_PER_SQUARE;

  const {
    name,
    imageUrl,
    description,
    ac = "",
    damage = "",
    price,
    category = "Uncategorized",
  } = item;

  itemTooltip.innerHTML = `
    <div class="flex items-start">
        <div>
            <h4 class="font-bold text-base mb-1">${name}</h4>
            <p class="text-xs text-gray-400 mb-2">${category}</p>
            <p class="text-sm mb-2">${description || "No description."}</p>
            <p class="text-sm mb-2" ${!damage && "hidden"}>Damage: ${damage}</p>
            <p class="text-sm mb-2" ${!ac && "hidden"}>AC: ${ac}</p>
            <p class="text-sm mb-2">Weight: ${weight.toFixed(1)} lbs</p>
            <p class="text-sm">Price: ${formatPrice(price)}</p>
        </div>
        <img 
        src="${imageUrl || ""}" 
        alt="${name}"
        ${!imageUrl && "hidden"}
        class="w-24 ml-4 flex-shrink-0 cursor-pointer transition-all duration-300"
        onclick="this.classList.toggle('enlarged-tooltip-image')">
    </div>`;

  showTooltip();

  // If same item is hovered, do not reposition tooltip
  if (previousElement === itemDiv) return;
  previousElement = itemDiv;

  // Position the tooltip relative to the mouse cursor
  let tooltipX = event.clientX + window.scrollX - itemTooltip.offsetWidth / 2;
  let tooltipY = event.clientY + window.scrollY - itemTooltip.offsetHeight - 10;

  if (tooltipX < 0) tooltipX = 16;
  if (tooltipY < 0) tooltipY = 16;

  itemTooltip.style.left = `${tooltipX}px`;
  itemTooltip.style.top = `${tooltipY}px`;
}

// --- Generic Modal Functions (Refactored) ---
function showGenericModal(modalElement) {
  modalElement.classList.remove("hidden");
  // Force reflow to ensure initial opacity: 0 is applied before transition
  void modalElement.offsetWidth;
  modalElement.classList.add("is-visible");
}

function hideGenericModal(modalElement) {
  modalElement.classList.remove("is-visible");
  setTimeout(() => {
    modalElement.classList.add("hidden");
  }, 300); // Match CSS transition duration
}

function showEditModal(title, inputType, initialValue, callback) {
  editModalTitle.innerText = title;
  editModalInput.classList.add("hidden");
  editModalTextarea.classList.add("hidden");
  editModalPriceFields.classList.add("hidden");
  editModalColorInput.classList.add("hidden");

  if (inputType === "textarea") {
    editModalTextarea.value = initialValue;
    editModalTextarea.classList.remove("hidden");
  } else if (inputType === "price") {
    editPriceCP.value = initialValue.cp || 0;
    editPriceSP.value = initialValue.sp || 0;
    editPriceGP.value = initialValue.gp || 0;
    editPricePP.value = initialValue.pp || 0;
    editModalPriceFields.classList.remove("hidden");
  } else if (inputType === "color") {
    editModalColorInput.value = initialValue;
    editModalColorInput.classList.remove("hidden");
  } else {
    editModalInput.type = inputType;
    editModalInput.value = initialValue;
    editModalInput.classList.remove("hidden");
  }

  currentEditCallback = callback;
  showGenericModal(editModal); // Use the generic show function
}

function hideEditModal() {
  hideGenericModal(editModal); // Use the generic hide function
  currentEditCallback = null;
}

// --- Confirmation Modal Functions (NEW) ---
function showConfirmModal(message, onConfirm) {
  confirmModalMessage.textContent = message;
  currentConfirmCallback = onConfirm;
  showGenericModal(confirmModal);
}

function hideConfirmModal() {
  hideGenericModal(confirmModal);
  currentConfirmCallback = null;
}

// --- Context Menu Functions ---
function showContextMenu(x, y) {
  itemContextMenu.style.display = "flex";
  itemContextMenu.style.left = `${x + window.scrollX}px`;
  itemContextMenu.style.top = `${y + window.scrollY}px`;
}

function hideContextMenu() {
  itemContextMenu.style.display = "none";
  contextMenuItemInstanceId = null;
  contextMenuAvailableItemId = null;
}

// --- Shape Edit Modal Functions (NEW) ---
function showShapeEditModal(itemId) {
  editingItemId = itemId;
  const item = availableItems.find((a) => a.id === itemId);
  if (!item) {
    showAlert("Error: Item not found for shape editing.");
    return;
  }

  // Initialize the modal's shape with the item's current shape, padded to SHAPE_EDITOR_SIZE
  currentShapeEditModalShape = Array(SHAPE_EDITOR_SIZE)
    .fill(null)
    .map(() => Array(SHAPE_EDITOR_SIZE).fill(0));

  // Copy the item's shape into the center of the 20x20 grid, or top-left if it's too big
  const startRow = Math.floor((SHAPE_EDITOR_SIZE - item.height) / 2);
  const startCol = Math.floor((SHAPE_EDITOR_SIZE - item.width) / 2);

  for (let r = 0; r < item.height; r++) {
    for (let c = 0; c < item.width; c++) {
      if (item.shape[r] && item.shape[r][c] === 1) {
        const targetRow = startRow + r;
        const targetCol = startCol + c;
        if (targetRow < SHAPE_EDITOR_SIZE && targetCol < SHAPE_EDITOR_SIZE) {
          currentShapeEditModalShape[targetRow][targetCol] = 1;
        }
      }
    }
  }

  // Render the shape editor within the modal
  renderGenericShapeEditor(
    shapeEditEditor,
    currentShapeEditModalShape,
    (r, c, val) => {
      currentShapeEditModalShape[r][c] = val;
    },
    () =>
      updateGenericCalculatedWeight(
        itemEditBaseWeightInput,
        currentShapeEditModalShape
      ),
    shapeEditModalState
  );
  showGenericModal(shapeEditModal);
}

function hideShapeEditModal() {
  hideGenericModal(shapeEditModal);
  editingItemId = null;
  // Reset modal's shape editor state
  currentShapeEditModalShape = Array(SHAPE_EDITOR_SIZE)
    .fill(null)
    .map(() => Array(SHAPE_EDITOR_SIZE).fill(0));
  shapeEditModalState.isDrawing = false;
  shapeEditModalState.drawingValue = 0;
}

// --- D&D Item Data (New) ---
const defaultDnDItems = [];

// --- Backpack Management Functions ---
function saveCurrentBackpackState() {
  if (currentBackpackId && allBackpacksData[currentBackpackId]) {
    const currentBackpack = allBackpacksData[currentBackpackId];
    currentBackpack.placedItems = placedItems;
    currentBackpack.copperPieces = copperPieces;
    currentBackpack.silverPieces = silverPieces;
    currentBackpack.goldPieces = goldPieces;
    currentBackpack.platinumPieces = platinumPieces;
    currentBackpack.strengthScore = parseInt(currentStrengthScoreSelect.value);
    currentBackpack.creatureSize = currentCreatureSizeSelect.value;
    currentBackpack.theme = backpackThemeSelector.value;
    // currentBackpackId = currentBackpack.id;
  }
}

function loadBackpackState(backpackId) {
  currentBackpackId = backpackId;
  const backpackData = allBackpacksData[backpackId];

  console.log(`Loading backpack state for ID: ${backpackId}`, backpackData);

  if (backpackData) {
    placedItems = backpackData.placedItems;
    copperPieces = backpackData.copperPieces || 0;
    silverPieces = backpackData.silverPieces || 0;
    goldPieces = backpackData.goldPieces || 0;
    platinumPieces = backpackData.platinumPieces || 0;
    currentStrengthScoreSelect.value = backpackData.strengthScore;
    currentCreatureSizeSelect.value = backpackData.creatureSize;
    backpackThemeSelector.value = backpackData.theme || "default";
  } else {
    // Fallback for safety, though this shouldn't be reached with proper checks
    placedItems = [];
    copperPieces = 0;
    silverPieces = 0;
    goldPieces = 0;
    platinumPieces = 0;
    backpackThemeSelector.value = "default";
  }
  renderAll();
}

function createNewBackpack(name, strength, size) {
  const newId = generateUniqueId();
  const newBackpackMeta = { id: newId, name };
  backpacksMeta.push(newBackpackMeta);

  allBackpacksData[newId] = {
    placedItems: [],
    strengthScore: strength,
    creatureSize: size,
    copperPieces: 0,
    silverPieces: 0,
    goldPieces: 0,
    platinumPieces: 0,
    theme: "default",
  };

  saveCurrentBackpackState(); // Save state of the old backpack before switching
  loadBackpackState(newId); // Switch to the newly created backpack
  showAlert(`Backpack '${name}' created!`);
  saveDataToLocalStorage();
}

function deleteCurrentBackpack() {
  if (backpacksMeta.length <= 1) {
    showAlert("Cannot delete the last backpack. You need at least one.");
    return;
  }

  const backpackToDelete = backpacksMeta.find(
    (bp) => bp.id === currentBackpackId
  );
  if (!backpackToDelete) {
    showAlert("No backpack selected to delete.");
    return;
  }

  showConfirmModal(
    `Are you sure you want to delete the backpack '${backpackToDelete.name}'? This action cannot be undone.`,
    () => {
      backpacksMeta = backpacksMeta.filter((bp) => bp.id !== currentBackpackId);
      delete allBackpacksData[currentBackpackId];

      // Switch to the first available backpack
      currentBackpackId = backpacksMeta[0].id;
      loadBackpackState(currentBackpackId);
      showAlert(`Backpack '${backpackToDelete.name}' deleted.`);
      saveDataToLocalStorage();
    }
  );
}

function clearCurrentBackpack() {
  if (!currentBackpackId) {
    showAlert("No backpack selected.");
    return;
  }
  const backpackToClear = backpacksMeta.find(
    (bp) => bp.id === currentBackpackId
  );

  showConfirmModal(
    `Are you sure you want to remove all items from '${backpackToClear.name}'?`,
    () => {
      allBackpacksData[currentBackpackId].placedItems = [];
      placedItems = []; // Update the live reference
      showAlert(`Backpack '${backpackToClear.name}' has been cleared.`);
      renderAll();
      saveDataToLocalStorage();
    }
  );
}

function renameCurrentBackpack() {
  if (!currentBackpackId) {
    showAlert("No backpack selected.");
    return;
  }
  const backpackToRename = backpacksMeta.find(
    (bp) => bp.id === currentBackpackId
  );

  showEditModal(`Rename Backpack`, "text", backpackToRename.name, (newName) => {
    if (!newName.trim()) {
      showAlert("Backpack name cannot be empty.");
      return;
    }
    if (
      backpacksMeta.some(
        (bp) =>
          bp.name.toLowerCase() === newName.toLowerCase() &&
          bp.id !== currentBackpackId
      )
    ) {
      showAlert("A backpack with this name already exists.");
      return;
    }

    backpackToRename.name = newName.trim();
    showAlert(`Backpack renamed to '${newName.trim()}'.`);
    renderBackpackSelector();
    saveDataToLocalStorage();
  });
}

function renderBackpackSelector() {
  backpackSelector.innerHTML = "";
  backpacksMeta.forEach((bp) => {
    const option = document.createElement("option");
    option.value = bp.id;
    option.textContent = bp.name;
    if (bp.id === currentBackpackId) {
      option.selected = true;
    }
    backpackSelector.appendChild(option);

    const name = backpacksMeta.find(({ id }) => id === currentBackpackId).name;
    document.querySelector(
      "#current-backpack-name"
    ).innerText = `Backpack: ${name}`;
  });
}

// --- Local Storage Functions ---
function saveDataToLocalStorage() {
  try {
    const data = {
      availableItems: availableItems,
      backpacksMeta: backpacksMeta,
      allBackpacksData: allBackpacksData,
      currentBackpackId: currentBackpackId,
    };
    localStorage.setItem("inventoryManagerData", JSON.stringify(data));
    console.log("Data saved to local storage.");
  } catch (e) {
    console.error("Error saving to local storage:", e);
    showAlert(
      "Failed to save data automatically. Please use Export if you want to save."
    );
  }
}

function loadDataFromLocalStorage() {
  try {
    const dataString = localStorage.getItem("inventoryManagerData");
    if (dataString) {
      const data = JSON.parse(dataString);

      // Load availableItems
      if (data.availableItems && Array.isArray(data.availableItems)) {
        availableItems = data.availableItems.filter(
          (item) =>
            item.id &&
            typeof item.name === "string" &&
            Array.isArray(item.shape)
        );
      } else {
        availableItems = defaultDnDItems;
      }

      // Load backpacks
      if (
        data.backpacksMeta &&
        Array.isArray(data.backpacksMeta) &&
        data.backpacksMeta.length > 0
      ) {
        backpacksMeta = data.backpacksMeta;
        allBackpacksData = data.allBackpacksData || {};
        currentBackpackId = data.currentBackpackId || backpacksMeta[0].id;

        // Data migration: ensure old backpacks get stats and themes
        for (const bpId in allBackpacksData) {
          if (!allBackpacksData[bpId].hasOwnProperty("strengthScore")) {
            allBackpacksData[bpId].strengthScore = 10; // Default strength
          }
          if (!allBackpacksData[bpId].hasOwnProperty("creatureSize")) {
            allBackpacksData[bpId].creatureSize = "Medium"; // Default size
          }
          if (!allBackpacksData[bpId].hasOwnProperty("theme")) {
            allBackpacksData[bpId].theme = "default"; // Default theme
          }
        }
      } else {
        // No saved backpacks, create a default one
        createNewBackpack("My First Backpack", 10, "Medium");
      }

      // Load the current backpack's state
      loadBackpackState(currentBackpackId);
    } else {
      // No data in local storage, initialize with defaults
      availableItems = defaultDnDItems;
      createNewBackpack("My First Backpack", 10, "Medium");
    }
  } catch (e) {
    console.error("Error loading from local storage:", e);
    showAlert("Failed to load saved data. Starting fresh.");
    availableItems = defaultDnDItems;
    backpacksMeta = [];
    allBackpacksData = {};
    createNewBackpack("My First Backpack", 10, "Medium");
  }
}

// --- Google Sheet Integration Functions ---
async function saveDataToGoogleSheet() {
  const url = APPS_SCRIPT_WEB_APP_URL;
  setLoadingState(saveToSheetBtn, saveToSheetBtnText, saveToSheetLoading, true);
  saveCurrentBackpackState();

  const sheet = await fetch(url, { method: "GET", mode: "cors" });
  const sheetItems = await sheet.json();

  const combinedItems = [...sheetItems.availableItems, ...availableItems];

  const deletedItems = combinedItems
    .filter((item) => item.deleted)
    .map((item) => item.id);

  const itemMap = new Map();
  // Set deleted for items that are marked as deleted clientside
  combinedItems.forEach((item) => {
    // Mark as deleted
    if (deletedItems.includes(item.id)) {
      itemMap.set(item.id, { ...item, deleted: true });
    }
    itemMap.set(item.id, item);
  });

  const uniqueItems = Array.from(itemMap.values());

  try {
    const dataToSave = {
      availableItems: uniqueItems,
    };
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dataToSave),
    });
    const result = await response.json();
    if (response.ok && result.success) {
      showAlert("Data saved to Google Sheet successfully!");
    } else {
      showAlert(`Failed to save data: ${result.error || response.statusText}`);
    }
  } catch (error) {
    console.error("Error saving to Google Sheet:", error);
    showAlert("Network error. Check console for details.");
  } finally {
    setLoadingState(
      saveToSheetBtn,
      saveToSheetBtnText,
      saveToSheetLoading,
      false
    );
  }
}

async function loadDataFromGoogleSheet() {
  const url = APPS_SCRIPT_WEB_APP_URL;
  setLoadingState(
    loadFromSheetBtn,
    loadFromSheetBtnText,
    loadFromSheetLoading,
    true
  );

  try {
    const response = await fetch(url, { method: "GET", mode: "cors" });
    const result = await response.json();
    if (response.ok && !result.error) {
      if (result.availableItems) {
        const combinedItems = [...availableItems, ...result.availableItems];
        const deleteditems = combinedItems
          .filter((item) => item.deleted)
          .map((item) => item.id);

        const itemMap = new Map();
        combinedItems.forEach((item) => {
          if (deleteditems.includes(item.id)) return; // Skip deleted items
          itemMap.set(item.id, item);
        });
        const uniqueItems = Array.from(itemMap.values());

        availableItems = uniqueItems;
      }

      if (!currentBackpackId || !allBackpacksData[currentBackpackId]) {
        currentBackpackId = backpacksMeta[0]?.id || null;
      }
      if (currentBackpackId) {
        loadBackpackState(currentBackpackId);
      }
      renderAll();
      showAlert("Data loaded from Google Sheet successfully!");
    } else {
      showAlert(`Failed to load data: ${result.error || response.statusText}`);
    }
  } catch (error) {
    console.error("Error loading from Google Sheet:", error);
    showAlert("Network error. Check console for details.");
  } finally {
    setLoadingState(
      loadFromSheetBtn,
      loadFromSheetBtnText,
      loadFromSheetLoading,
      false
    );
    saveDataToLocalStorage(); // Save loaded data to local storage
  }
}

function setLoadingState(button, textElement, spinnerElement, isLoading) {
  if (isLoading) {
    button.disabled = true;
    textElement.classList.add("hidden");
    spinnerElement.classList.remove("hidden");
  } else {
    button.disabled = false;
    textElement.classList.remove("hidden");
    spinnerElement.classList.add("hidden");
  }
}

// --- Character Stats & Backpack Dimension Calculation ---
function calculateMaxWeight() {
  if (!currentBackpackId || !allBackpacksData[currentBackpackId]) {
    currentMaxWeight = 0;
    encumberedThreshold = 0;
    heavilyEncumberedThreshold = 0;
    dynamicBackpackRows = 1;
    dynamicBackpackCols = 1;
    return;
  }

  const currentBackpack = allBackpacksData[currentBackpackId];
  const strength = currentBackpack.strengthScore;
  const size = currentBackpack.creatureSize;

  const baseCarryingCapacity = strength * 15;
  const sizeMultiplier = CREATURE_SIZE_MULTIPLIERS[size] || 1;
  currentMaxWeight = baseCarryingCapacity * sizeMultiplier;
  encumberedThreshold = strength * ENCUMBERED_MULTIPLIER;
  heavilyEncumberedThreshold = strength * HEAVILY_ENCUMBERED_MULTIPLIER;

  const maxSquares = Math.floor(currentMaxWeight / WEIGHT_PER_SQUARE);
  let newSideLength = Math.ceil(Math.sqrt(maxSquares));
  if (newSideLength === 0) newSideLength = 1;
  newSideLength = Math.min(newSideLength, MAX_LOGICAL_GRID_SIDE);

  if (
    dynamicBackpackRows !== newSideLength ||
    dynamicBackpackCols !== newSideLength
  ) {
    dynamicBackpackRows = newSideLength;
    dynamicBackpackCols = newSideLength;
    filterPlacedItemsByNewDimensions();
  }
}

function filterPlacedItemsByNewDimensions() {
  let itemsChanged = false;
  const filteredPlacedItems = placedItems.filter((pItem) => {
    const itemData = availableItems.find((aItem) => aItem.id === pItem.itemId);
    if (!itemData) {
      itemsChanged = true;
      return false;
    }
    const itemToPlace = {
      ...itemData,
      shape: pItem.shape,
      width: pItem.width,
      height: pItem.height,
    };
    const fitsWithinBounds =
      pItem.row + itemToPlace.height <= dynamicBackpackRows &&
      pItem.col + itemToPlace.width <= dynamicBackpackCols;

    if (!fitsWithinBounds) {
      itemsChanged = true;
      showAlert(`Item '${itemData.name}' removed as it no longer fits.`);
    }
    return fitsWithinBounds;
  });

  if (itemsChanged) {
    allBackpacksData[currentBackpackId].placedItems = filteredPlacedItems;
    placedItems = filteredPlacedItems;
    saveDataToLocalStorage();
  }
}

function checkOverlap(
  item,
  startRow,
  startCol,
  currentGrid,
  ignoreInstanceId = null
) {
  if (
    startRow < 0 ||
    startCol < 0 ||
    startRow + item.height > dynamicBackpackRows ||
    startCol + item.width > dynamicBackpackCols
  ) {
    return false;
  }

  for (let r = 0; r < item.height; r++) {
    for (let c = 0; c < item.width; c++) {
      if (item.shape[r] && item.shape[r][c] === 1) {
        const gridRow = startRow + r;
        const gridCol = startCol + c;

        if (gridRow >= dynamicBackpackRows || gridCol >= dynamicBackpackCols) {
          return false;
        }

        const cellContent = currentGrid[gridRow][gridCol];
        if (cellContent !== null && cellContent !== ignoreInstanceId) {
          return false;
        }
      }
    }
  }
  return true;
}

function getEncumbranceStatus(weight) {
  if (!currentBackpackId || !allBackpacksData[currentBackpackId])
    return { status: "N/A", colorClass: "text-gray-400" };

  const backpack = allBackpacksData[currentBackpackId];
  const heavy = backpack.strengthScore * HEAVILY_ENCUMBERED_MULTIPLIER;
  const encumbered = backpack.strengthScore * ENCUMBERED_MULTIPLIER;

  if (weight > heavy) {
    return {
      status:
        "Heavily Encumbered: Your speed has dropped by 20 feet and you have disadvantage on ability checks, attack rolls, and saving throws that use Strength, Dexterity, or Constitution.",
      colorClass: "text-red-400",
      outlineColorClass: "outline-red",
    };
  } else if (weight > encumbered) {
    return {
      status: "Encumbered: Your speed has dropped by 10 feet",
      colorClass: "text-yellow-400",
      outlineColorClass: "outline-yellow",
    };
  } else {
    return {
      status: "",
      colorClass: "text-green-400",
      outlineColorClass: "outline-green",
    };
  }
}

const emptyImage = new Image();
// An empty GIF is a common way to create a transparent image
emptyImage.src =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// --- Drag and Drop Handlers ---
function handleDragStart(e, item, sourceInstanceId = null) {
  hideTooltip(); // Hide tooltip on drag start
  e.dataTransfer.setDragImage(emptyImage, 0, 0);

  let initialShape = item.shape;
  let initialWidth = item.width;
  let initialHeight = item.height;

  if (sourceInstanceId) {
    const placedItem = placedItems.find(
      (p) => p.instanceId === sourceInstanceId
    );
    if (placedItem) {
      initialShape = placedItem.shape;
      initialWidth = placedItem.width;
      initialHeight = placedItem.height;
      hoveredCell = { row: placedItem.row, col: placedItem.col };
      originalPlacedItemPosition = { ...placedItem };
    }
  } else {
    hoveredCell = { row: 0, col: 0 };
  }

  draggingItem = {
    ...item,
    instanceId: sourceInstanceId || generateUniqueId(),
    shape: initialShape,
    width: initialWidth,
    height: initialHeight,
  };
  isDraggingFromBackpack = sourceInstanceId !== null;
  droppedInBackpackArea = false;
  e.dataTransfer.setData("text/plain", item.id);
  e.dataTransfer.effectAllowed = "move";

  setTimeout(() => {
    e.target.style.visibility = "hidden";
  }, 0);
}

let lastMouseX = 0;
let lastMouseY = 0;
let isDragUpdateScheduled = false;

let hoveredCell = { row: -1, col: -1 };
let isDropPositionValid = false;

/**
 * Handles the 'dragover' event synchronously.
 * Calculates the target cell, checks validity, and sets the dropEffect.
 * Then, it schedules a visual-only update.
 * @param {DragEvent} e - The dragover event object.
 */
function handleDragOver(e) {
  e.preventDefault();
  if (!draggingItem) return;

  // Save the mouse position
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  // --- All logic is handled here ---
  const backpackContainerWidth = backpackGridContainer.offsetWidth;
  const backpackContainerHeight = backpackGridContainer.offsetHeight;
  const cellSize = Math.min(
    backpackContainerWidth / dynamicBackpackCols,
    backpackContainerHeight / dynamicBackpackRows
  );

  const backpackRect = backpackGridContainer.getBoundingClientRect();
  const x = lastMouseX - backpackRect.left;
  const y = lastMouseY - backpackRect.top;
  targetCol = Math.floor(x / cellSize);
  targetRow = Math.floor(y / cellSize);

  // Clamp the row and column to stay within the grid boundaries
  let clampedRow = Math.max(
    0,
    Math.min(targetRow, dynamicBackpackRows - draggingItem.height)
  );
  let clampedCol = Math.max(
    0,
    Math.min(targetCol, dynamicBackpackCols - draggingItem.width)
  );
  clampedRow = isNaN(clampedRow) || clampedRow < 0 ? 0 : clampedRow;
  clampedCol = isNaN(clampedCol) || clampedCol < 0 ? 0 : clampedCol;

  // Create a temporary grid to check for overlaps
  const tempGrid = Array(dynamicBackpackRows)
    .fill(null)
    .map(() => Array(dynamicBackpackCols).fill(null));
  placedItems.forEach((pItem) => {
    if (pItem.instanceId !== draggingItem.instanceId) {
      for (let r = 0; r < pItem.height; r++) {
        for (let c = 0; c < pItem.width; c++) {
          if (pItem.shape[r]?.[c] === 1) {
            tempGrid[pItem.row + r][pItem.col + c] = pItem.instanceId;
          }
        }
      }
    }
  });

  // Save the calculated state into our shared variables
  hoveredCell = { row: clampedRow, col: clampedCol };
  isDropPositionValid = checkOverlap(
    draggingItem,
    hoveredCell.row,
    hoveredCell.col,
    tempGrid,
    draggingItem.instanceId
  );

  // Set the dropEffect synchronously based on the result
  e.dataTransfer.dropEffect = isDropPositionValid ? "move" : "none";

  // Schedule the visual-only update
  if (!isDragUpdateScheduled) {
    isDragUpdateScheduled = true;
    requestAnimationFrame(updateGridPreview);
  }
}

/**
 * Updates only the visual preview element.
 * Uses the pre-calculated state from handleDragOver.
 */
function updateGridPreview() {
  isDragUpdateScheduled = false; // Always reset the flag
  if (!draggingItem) return;

  // We still need the cell size to position the element correctly
  const backpackContainerWidth = backpackGridContainer.offsetWidth;
  const backpackContainerHeight = backpackGridContainer.offsetHeight;
  const cellSize = Math.min(
    backpackContainerWidth / dynamicBackpackCols,
    backpackContainerHeight / dynamicBackpackRows
  );

  // Use the saved values to update the preview's position
  Object.assign(dragPreviewElement.style, {
    top: `${hoveredCell.row * cellSize}px`,
    left: `${hoveredCell.col * cellSize}px`,
    width: `${draggingItem.width * cellSize}px`,
    height: `${draggingItem.height * cellSize}px`,
  });

  // Update the appearance based on whether the position is valid
  // (This replaces the old dropEffect logic for user feedback)
  //   dragPreviewElement.style.border = isDropPositionValid
  //     ? "rgba(0, 255, 0, 0.5)" // Green if valid
  //     : "rgba(255, 0, 0, 0.5)"; // Red if invalid

  // Remaining visual logic
  dragPreviewElement.className =
    "absolute rounded-md opacity-50 z-20 pointer-events-none";
  renderShapeIntoElement(dragPreviewElement, draggingItem, cellSize);
  dragPreviewElement.classList.remove("hidden");
}

function handleDragLeave(e) {
  const rect = backpackGridContainer.getBoundingClientRect();
  if (
    e.clientX <= rect.left ||
    e.clientX >= rect.right ||
    e.clientY <= rect.top ||
    e.clientY >= rect.bottom
  ) {
    dragPreviewElement.classList.add("hidden");
  }
}

function handleDrop(e) {
  e.preventDefault();
  droppedInBackpackArea = true;
  if (!draggingItem) return;

  const { row, col } = hoveredCell;
  const tempGridAtDrop = Array(dynamicBackpackRows)
    .fill(null)
    .map(() => Array(dynamicBackpackCols).fill(null));
  placedItems.forEach((pItem) => {
    if (pItem.instanceId !== draggingItem.instanceId) {
      for (let r = 0; r < pItem.height; r++) {
        for (let c = 0; c < pItem.width; c++) {
          if (pItem.shape[r]?.[c] === 1) {
            tempGridAtDrop[pItem.row + r][pItem.col + c] = pItem.instanceId;
          }
        }
      }
    }
  });

  const finalIsPhysicalOverlapValid = checkOverlap(
    draggingItem,
    row,
    col,
    tempGridAtDrop
  );

  if (finalIsPhysicalOverlapValid) {
    placeItem(draggingItem, row, col);
  } else {
    showAlert("Cannot drop item here: Overlaps or out of bounds.");
  }
}

function handleDragEnd(e) {
  e.target.style.visibility = "visible";
  if (isDraggingFromBackpack && !droppedInBackpackArea) {
    removeItemFromBackpack(draggingItem.instanceId);
    showAlert(`Item '${draggingItem.name}' removed from backpack.`);
  }
  draggingItem = null;
  isDraggingFromBackpack = false;
  originalPlacedItemPosition = null;
  hoveredCell = { row: -1, col: -1 };
  lastHoveredCell = { row: -1, col: -1 };
  isPhysicalOverlapValid = true;
  droppedInBackpackArea = false;
  dragPreviewElement.classList.add("hidden");
  hideTooltip();
  renderAll();
}

// --- Core Item Placement and Removal Functions ---
function placeItem(item, row, col) {
  const itemWeight =
    item.shape.flat().filter((cell) => cell === 1).length * WEIGHT_PER_SQUARE;
  const currentTotalWeight = placedItems
    .filter((pItem) => pItem.instanceId !== item.instanceId)
    .reduce((sum, pItem) => {
      const baseItem = availableItems.find(
        (aItem) => aItem.id === pItem.itemId
      );
      return (
        sum +
        (baseItem
          ? pItem.shape.flat().filter((c) => c === 1).length * WEIGHT_PER_SQUARE
          : 0)
      );
    }, 0);

  if (currentTotalWeight + itemWeight > currentMaxWeight) {
    showAlert(
      `Cannot place '${item.name}': Exceeds maximum carrying capacity.`
    );
    return false;
  }

  const existingIndex = placedItems.findIndex(
    (p) => p.instanceId === item.instanceId
  );
  if (existingIndex !== -1) {
    placedItems.splice(existingIndex, 1);
  }

  placedItems.push({
    itemId: item.id,
    instanceId: item.instanceId,
    row: row,
    col: col,
    shape: item.shape,
    width: item.width,
    height: item.height,
  });

  renderAll();
  saveDataToLocalStorage();
  return true;
}

function removeItemFromBackpack(instanceId) {
  if (!currentBackpackId || !allBackpacksData[currentBackpackId]) return;

  const initialLength = allBackpacksData[currentBackpackId].placedItems.length;

  allBackpacksData[currentBackpackId].placedItems = allBackpacksData[
    currentBackpackId
  ].placedItems.filter((pItem) => pItem.instanceId !== instanceId);

  // Re-point the global reference to the modified array
  placedItems = allBackpacksData[currentBackpackId].placedItems;

  if (placedItems.length < initialLength) {
    showAlert("Item removed from backpack.");
  }

  renderAll();
  saveDataToLocalStorage(); // Save after removing item
}

function deleteItem(itemId) {
  const item = availableItems.find((a) => a.id === itemId);
  if (!item) return;

  showConfirmModal(
    `Are you sure you want to delete the item '${item.name}'? This will also remove all instances of this item from all backpacks.`,
    () => {
      availableItems = availableItems.map((aItem) => {
        if (aItem.id === itemId) return { ...item, deleted: true };
        return aItem;
      });

      let removedCount = 0;
      for (const bpId in allBackpacksData) {
        const bpData = allBackpacksData[bpId];
        const initialLength = bpData.placedItems.length;
        bpData.placedItems = bpData.placedItems.filter(
          (pItem) => pItem.itemId !== itemId
        );
        removedCount += initialLength - bpData.placedItems.length;
      }

      if (currentBackpackId) {
        placedItems = allBackpacksData[currentBackpackId].placedItems;
      }

      showAlert(
        `Item type '${item.name}' and ${removedCount} instance(s) removed.`
      );

      renderAll();
      saveDataToLocalStorage();
    }
  );
}

// --- Rendering Functions ---
function renderShapeIntoElement(targetElement, item, cellSize) {
  targetElement.innerHTML = "";
  if (!item?.shape) return;
  item.shape.forEach((rowArr, rIndex) => {
    rowArr.forEach((cellValue, cIndex) => {
      if (cellValue === 1) {
        const cellDiv = document.createElement("div");
        cellDiv.className = "item-shape-cell";
        cellDiv.style.cssText = `position: absolute; left: ${
          cIndex * cellSize
        }px; top: ${
          rIndex * cellSize
        }px; width: ${cellSize}px; height: ${cellSize}px; background-color: ${
          item.color
        };`;
        targetElement.appendChild(cellDiv);
      }
    });
  });
}

function renderGenericShapeEditor(
  targetEditorElement,
  shapeMatrix,
  onCellChange,
  onUpdateCallback,
  stateObject
) {
  targetEditorElement.innerHTML = "";
  shapeMatrix.forEach((rowArr, r) => {
    rowArr.forEach((cellValue, c) => {
      const cell = document.createElement("div");
      cell.className = `shape-editor-cell ${cellValue === 1 ? "active" : ""}`;
      cell.addEventListener("mousedown", (e) => {
        e.preventDefault();
        stateObject.isDrawing = true;
        const newValue = shapeMatrix[r][c] === 1 ? 0 : 1;
        stateObject.drawingValue = newValue;
        onCellChange(r, c, newValue);
        cell.classList.toggle("active", newValue === 1);
        onUpdateCallback();
      });
      cell.addEventListener("mouseover", (e) => {
        if (stateObject.isDrawing && e.buttons === 1) {
          if (shapeMatrix[r][c] !== stateObject.drawingValue) {
            onCellChange(r, c, stateObject.drawingValue);
            cell.classList.toggle("active", stateObject.drawingValue === 1);
            onUpdateCallback();
          }
        }
      });
      targetEditorElement.appendChild(cell);
    });
  });
  onUpdateCallback();
}

function updateGenericCalculatedWeight(inputElement, shapeMatrix) {
  const { occupiedCells } = getTrimmedShape(shapeMatrix);
  inputElement.value = (occupiedCells * WEIGHT_PER_SQUARE).toFixed(1);
}

function renderAvailableItems() {
  availableItemsList.innerHTML = "";
  const filteredItems = availableItems
    .filter(
      (item) =>
        item.name.toLowerCase().includes(currentSearchQuery.toLowerCase()) &&
        (currentFilterCategory === "All" ||
          item.category === currentFilterCategory)
    )
    .filter((item) => !item.deleted); // Exclude deleted items

  const categorizedItems = filteredItems.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    (acc[category] = acc[category] || []).push(item);
    return acc;
  }, {});

  const allCategories = [
    "All",
    ...new Set(availableItems.map((item) => item.category || "Uncategorized")),
  ].sort();

  itemCategoryFilter.innerHTML = allCategories
    .map(
      (category) =>
        `<option value="${category}" ${
          category === currentFilterCategory ? "selected" : ""
        }>${category}</option>`
    )
    .join("");

  const sortedCategories = Object.keys(categorizedItems).sort(
    // Put "Custom Items" at the top of the list
    (a, b) => {
      if (a === "Custom Items") return -1;
      if (b === "Custom Items") return 1;
      return a.localeCompare(b);
    }
  );

  if (sortedCategories.length === 0) {
    availableItemsList.innerHTML = `<div class="text-gray-400 text-center py-8">No items found.</div>`;
    return;
  }

  sortedCategories.forEach((category) => {
    const categoryHeader = document.createElement("h3");
    categoryHeader.className =
      "text-2xl font-semibold text-gray-300 mt-4 mb-2 w-full border-b border-gray-600 pb-1";
    categoryHeader.textContent = category;
    availableItemsList.appendChild(categoryHeader);

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "flex flex-wrap gap-4 w-full";
    categorizedItems[category]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        const itemWrapper = document.createElement("div");
        itemWrapper.className =
          "flex flex-col items-center gap-1 item-enter-active";

        const itemDiv = document.createElement("div");
        itemDiv.className =
          "bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing relative group flex-shrink-0";
        itemDiv.draggable = true;
        itemDiv.style.width = `${item.width * INITIAL_ITEM_CELL_SIZE_PX}px`;
        itemDiv.style.height = `${item.height * INITIAL_ITEM_CELL_SIZE_PX}px`;
        itemDiv.style.backgroundColor = "transparent";

        const shapeContainer = document.createElement("div");
        shapeContainer.className = "absolute inset-0";
        renderShapeIntoElement(shapeContainer, item, INITIAL_ITEM_CELL_SIZE_PX);
        itemDiv.appendChild(shapeContainer);
        itemWrapper.appendChild(itemDiv);

        const itemNameSpan = document.createElement("span");
        itemNameSpan.className =
          "text-gray-200 font-semibold text-sm text-center max-w-full truncate";
        itemNameSpan.textContent = item.name;
        itemWrapper.appendChild(itemNameSpan);

        itemDiv.addEventListener("dragstart", (e) => handleDragStart(e, item));
        itemDiv.addEventListener("dragend", handleDragEnd);

        itemDiv.addEventListener("mouseover", (e) => {
          renderTooltip(e, item, itemDiv);
        });

        itemDiv.addEventListener("mouseout", (e) => {
          hideTooltip();
        });

        itemDiv.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          contextMenuAvailableItemId = item.id;
          contextMenuItemInstanceId = null;
          showContextMenu(e.clientX, e.clientY);
        });
        itemsContainer.appendChild(itemWrapper);
      });
    availableItemsList.appendChild(itemsContainer);
  });
}

function renderBackpackGrid() {
  const gridChildren = Array.from(backpackGridContainer.children);
  gridChildren.forEach((child) => {
    if (child.id !== "drag-preview") {
      backpackGridContainer.removeChild(child);
    }
  });

  const backpackContainerWidth = backpackGridContainer.offsetWidth;
  const backpackContainerHeight = backpackGridContainer.offsetHeight;
  const cellSize = Math.min(
    backpackContainerWidth / dynamicBackpackCols,
    backpackContainerHeight / dynamicBackpackRows
  );

  backpackGridContainer.style.gridTemplateRows = `repeat(${dynamicBackpackRows}, ${cellSize}px)`;
  backpackGridContainer.style.gridTemplateColumns = `repeat(${dynamicBackpackCols}, ${cellSize}px)`;

  for (let i = 0; i < dynamicBackpackRows * dynamicBackpackCols; i++) {
    const cell = document.createElement("div");
    cell.className = "border border-gray-700 transition-colors duration-100";
    cell.style.pointerEvents = "none";
    backpackGridContainer.insertBefore(cell, dragPreviewElement);
  }

  placedItems.forEach((pItem) => {
    const item = availableItems.find((aItem) => aItem.id === pItem.itemId);
    if (!item) return;

    const itemToRender = { ...item, ...pItem };
    const placedItemDiv = document.createElement("div");
    placedItemDiv.className =
      "absolute rounded-md cursor-grab active:cursor-grabbing flex items-center justify-center text-white font-semibold transition-all duration-100 item-enter-active";
    placedItemDiv.style.cssText = `top: ${pItem.row * cellSize}px; left: ${
      pItem.col * cellSize
    }px; width: ${pItem.width * cellSize}px; height: ${
      pItem.height * cellSize
    }px; z-index: 10; pointer-events: auto;`;
    placedItemDiv.draggable = true;
    placedItemDiv.dataset.instanceId = pItem.instanceId;
    placedItemDiv.dataset.highlightId = pItem.itemId;

    const shapeContainer = document.createElement("div");
    shapeContainer.className = "absolute inset-0";
    renderShapeIntoElement(shapeContainer, itemToRender, cellSize);
    placedItemDiv.appendChild(shapeContainer);

    placedItemDiv.addEventListener("dragstart", (e) =>
      handleDragStart(e, item, pItem.instanceId)
    );
    placedItemDiv.addEventListener("dragend", handleDragEnd);

    placedItemDiv.addEventListener("mouseover", (e) => {
      const item = availableItems.find((a) => a.id === pItem.itemId);
      if (!item) return;
      renderTooltip(e, item, placedItemDiv);
    });

    placedItemDiv.addEventListener("mouseout", () => {
      hideTooltip();
    });

    placedItemDiv.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      contextMenuItemInstanceId = pItem.instanceId;
      contextMenuAvailableItemId = null;
      showContextMenu(e.clientX, e.clientY);
    });
    backpackGridContainer.appendChild(placedItemDiv);
  });
}

function renderPlacedItemsList() {
  const itemCounts = placedItems.reduce((acc, pItem) => {
    const baseItem = availableItems.find((a) => a.id === pItem.itemId);
    if (baseItem) {
      acc[pItem.itemId] = (acc[pItem.itemId] || 0) + 1;
    }
    return acc;
  }, {});

  placedItemsList.innerHTML = ""; // Clear existing list

  if (Object.keys(itemCounts).length === 0) {
    placedItemsList.innerHTML = `<li class="text-gray-400 italic">Backpack is empty.</li>`;
    return;
  }

  const sortedItemIds = Object.keys(itemCounts).sort((a, b) => {
    const itemA = availableItems.find((item) => item.id === a)?.name || "";
    const itemB = availableItems.find((item) => item.id === b)?.name || "";
    return itemA.localeCompare(itemB);
  });

  sortedItemIds.forEach((itemId) => {
    const item = availableItems.find((a) => a.id === itemId);
    if (item) {
      const li = document.createElement("li");
      li.className =
        "flex justify-between items-center text-sm rounded-md hover:bg-gray-600 transition-colors cursor-pointer";
      li.dataset.highlightId = itemId;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = item.name;
      li.appendChild(nameSpan);

      const countSpan = document.createElement("span");
      countSpan.className = "font-semibold px-2 py-1 rounded-full text-xs";
      countSpan.textContent = `x${itemCounts[itemId]}`;
      li.appendChild(countSpan);

      li.addEventListener("mouseover", () => {
        document
          .querySelectorAll(`[data-highlight-id="${itemId}"]`)
          .forEach((el) => {
            el.classList.add("item-pulsate");
          });
      });

      li.addEventListener("mouseout", () => {
        document
          .querySelectorAll(`[data-highlight-id="${itemId}"]`)
          .forEach((el) => {
            el.classList.remove("item-pulsate");
          });
      });

      placedItemsList.appendChild(li);
    }
  });
}

function renderCurrentBackpackStats() {
  if (!currentBackpackId || !allBackpacksData[currentBackpackId]) {
    totalWeightSpan.textContent = `0 lbs`;
    maxWeightSpan.textContent = `0`;
    encumbranceStatusSpan.textContent = `Status: N/A`;
    encumbranceStatusSpan.className = `text-md font-medium mb-2 text-gray-400`;
    return;
  }

  const currentBackpack = allBackpacksData[currentBackpackId];
  currentStrengthScoreSelect.value = currentBackpack.strengthScore;
  currentCreatureSizeSelect.value = currentBackpack.creatureSize;
  backpackThemeSelector.value = currentBackpack.theme || "default";

  const totalWeight = placedItems.reduce((sum, pItem) => {
    const item = availableItems.find((aItem) => aItem.id === pItem.itemId);
    if (item && pItem.shape) {
      return (
        sum +
        pItem.shape.flat().filter((c) => c === 1).length * WEIGHT_PER_SQUARE
      );
    }
    return sum;
  }, 0);

  totalWeightSpan.textContent = `${totalWeight.toFixed(1)} lbs`;
  maxWeightSpan.textContent = currentMaxWeight.toFixed(1);

  const { status, colorClass, outlineColorClass } =
    getEncumbranceStatus(totalWeight);
  encumbranceStatusSpan.textContent = `${status}`;
  encumbranceStatusSpan.className = `text-md font-medium mb-2 ${colorClass}`;

  backpackGridContainer.className = `col-span-2 relative rounded-lg overflow-hidden w-full aspect-square ${
    currentBackpack.theme || "theme-default"
  } ${outlineColorClass}`;

  normalThresholdSpan.textContent = encumberedThreshold.toFixed(1);
  encumberedThresholdStartSpan.textContent = encumberedThreshold.toFixed(1);
  encumberedThresholdEndSpan.textContent =
    heavilyEncumberedThreshold.toFixed(1);
  heavilyEncumberedThresholdStartSpan.textContent =
    heavilyEncumberedThreshold.toFixed(1);
  heavilyEncumberedThresholdEndSpan.textContent = currentMaxWeight.toFixed(1);

  copperPiecesInput.value = copperPieces;
  silverPiecesInput.value = silverPieces;
  goldPiecesInput.value = goldPieces;
  platinumPiecesInput.value = platinumPieces;
}

function populateStatSelects(strengthSelect, sizeSelect) {
  strengthSelect.innerHTML = "";
  for (let i = 1; i <= 30; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    if (i === 10) option.selected = true; // Default to 10
    strengthSelect.appendChild(option);
  }

  sizeSelect.innerHTML = "";
  for (const size in CREATURE_SIZE_MULTIPLIERS) {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = size;
    if (size === "Medium") option.selected = true; // Default to Medium
    sizeSelect.appendChild(option);
  }
}

// --- Main Render Function ---
function renderAll() {
  calculateMaxWeight();
  renderBackpackSelector();
  renderAvailableItems();
  renderBackpackGrid();
  renderCurrentBackpackStats();
  renderPlacedItemsList();
  // This call was missing, it's needed for the main item creator
  renderGenericShapeEditor(
    shapeEditor,
    currentShapeEditorShape,
    (r, c, val) => {
      currentShapeEditorShape[r][c] = val;
    },
    () =>
      updateGenericCalculatedWeight(
        itemBaseWeightInput,
        currentShapeEditorShape
      ),
    mainEditorState
  );
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  populateStatSelects(newBackpackStrengthSelect, newBackpackSizeSelect);
  populateStatSelects(currentStrengthScoreSelect, currentCreatureSizeSelect);
  loadDataFromLocalStorage();
  renderAll();

  window.addEventListener("resize", renderBackpackGrid);
  document.addEventListener("mouseup", () => {
    mainEditorState.isDrawing = false;
    shapeEditModalState.isDrawing = false;
  });
  document.addEventListener("click", (e) => {
    if (!itemContextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  toggleLeftPaneMainBtn.addEventListener("click", () => {
    leftPane.classList.toggle("collapsed");
    toggleLeftPaneMainIcon.classList.toggle("rotate-180");
    setTimeout(renderAll, 310);
  });

  toggleCreatorBtn.addEventListener("click", () => {
    itemCreatorForm.classList.toggle("collapsed");
    toggleCreatorIcon.classList.toggle("rotated");
  });

  // toggleBackpackCreatorBtn.addEventListener("click", () => {
  //   backpackCreatorForm.classList.toggle("collapsed");
  //   toggleBackpackCreatorIcon.classList.toggle("rotated");
  // });

  toggleSettingsHeader.addEventListener("click", () => {
    allSettingsContent.classList.toggle("collapsed");
    toggleSettingsHeader
      .querySelector(".collapse-icon")
      .classList.toggle("rotated");
  });

  backpackCreatorForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = newBackpackNameInput.value.trim();
    if (!name) {
      showAlert("Please enter a name for the new backpack.");
      return;
    }
    if (
      backpacksMeta.some((bp) => bp.name.toLowerCase() === name.toLowerCase())
    ) {
      showAlert("A backpack with this name already exists.");
      return;
    }
    const strength = parseInt(newBackpackStrengthSelect.value);
    const size = newBackpackSizeSelect.value;
    createNewBackpack(name, strength, size);
    newBackpackNameInput.value = "";
  });

  backpackSelector.addEventListener("change", (e) => {
    saveCurrentBackpackState();
    loadBackpackState(e.target.value);
    saveDataToLocalStorage(); // Save after changing current backpack
  });

  renameBackpackBtn.addEventListener("click", renameCurrentBackpack);
  clearBackpackBtn.addEventListener("click", clearCurrentBackpack);
  deleteCurrentBackpackBtn.addEventListener("click", deleteCurrentBackpack);

  currentStrengthScoreSelect.addEventListener("change", (e) => {
    if (currentBackpackId) {
      allBackpacksData[currentBackpackId].strengthScore = parseInt(
        e.target.value
      );
      renderAll();
      saveDataToLocalStorage();
    }
  });

  currentCreatureSizeSelect.addEventListener("change", (e) => {
    if (currentBackpackId) {
      allBackpacksData[currentBackpackId].creatureSize = e.target.value;
      renderAll();
      saveDataToLocalStorage();
    }
  });

  backpackThemeSelector.addEventListener("change", (e) => {
    if (currentBackpackId) {
      allBackpacksData[currentBackpackId].theme = e.target.value;
      renderAll();
      saveDataToLocalStorage();
    }
  });

  //   Create Item
  itemCreatorForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = itemNameInput.value.trim();

    if (!name) {
      showAlert("Please enter a valid name for the item.");
      return;
    }

    const { shape, width, height, occupiedCells } = getTrimmedShape(
      currentShapeEditorShape
    );

    if (occupiedCells === 0) {
      showAlert("Please define a shape for the item.");
      return;
    }

    availableItems.push({
      id: generateUniqueId(),
      name,
      ac: parseInt(itemACInput.value) || 0,
      damage: itemDamageInput.value.trim(),
      imageUrl: itemImageUrlInput.value.trim() || "",
      description: itemDescriptionInput.value.trim(),
      baseWeight: occupiedCells * WEIGHT_PER_SQUARE,
      price: {
        cp: parseInt(itemPriceCPInput.value) || 0,
        sp: parseInt(itemPriceSPInput.value) || 0,
        gp: parseInt(itemPriceGPInput.value) || 0,
        pp: parseInt(itemPricePPInput.value) || 0,
      },
      shape,
      width,
      height,
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
      category: "Custom Items",
    });

    itemCreatorForm.reset();
    currentShapeEditorShape.forEach((row) => row.fill(0));
    renderAll();
    saveDataToLocalStorage();
  });

  clearShapeBtn.addEventListener("click", () => {
    currentShapeEditorShape.forEach((row) => row.fill(0));
    renderGenericShapeEditor(
      shapeEditor,
      currentShapeEditorShape,
      (r, c, val) => {
        currentShapeEditorShape[r][c] = val;
      },
      () =>
        updateGenericCalculatedWeight(
          itemBaseWeightInput,
          currentShapeEditorShape
        ),
      mainEditorState
    );
  });

  fillShapeBtn.addEventListener("click", () => {
    currentShapeEditorShape.forEach((row) => row.fill(1));
    renderGenericShapeEditor(
      shapeEditor,
      currentShapeEditorShape,
      (r, c, val) => {
        currentShapeEditorShape[r][c] = val;
      },
      () =>
        updateGenericCalculatedWeight(
          itemBaseWeightInput,
          currentShapeEditorShape
        ),
      mainEditorState
    );
  });

  backpackGridContainer.addEventListener("dragover", handleDragOver);
  backpackGridContainer.addEventListener("drop", handleDrop);
  backpackGridContainer.addEventListener("dragleave", handleDragLeave);

  [
    copperPiecesInput,
    silverPiecesInput,
    goldPiecesInput,
    platinumPiecesInput,
  ].forEach((input) => {
    input.addEventListener("change", (e) => {
      const currency = e.target.id;
      const value = parseInt(e.target.value) || 0;
      if (currency === "copperPieces") copperPieces = value;
      if (currency === "silverPieces") silverPieces = value;
      if (currency === "goldPieces") goldPieces = value;
      if (currency === "platinumPieces") platinumPieces = value;
      saveCurrentBackpackState();
      saveDataToLocalStorage();
    });
  });

  itemSearchInput.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value;
    renderAvailableItems();
  });
  itemCategoryFilter.addEventListener("change", (e) => {
    currentFilterCategory = e.target.value;
    renderAvailableItems();
  });

  exportBtn.addEventListener("click", () => {
    saveCurrentBackpackState();
    exportDataTextarea.value = JSON.stringify(
      {
        backpacksMeta,
        allBackpacksData,
        currentBackpackId,
      },
      null,
      2
    );
    showGenericModal(exportModal);
  });
  closeExportModalBtn.addEventListener("click", () =>
    hideGenericModal(exportModal)
  );
  importBtn.addEventListener("click", () => {
    importDataTextarea.value = "";
    showGenericModal(importModal);
  });
  cancelImportModalBtn.addEventListener("click", () =>
    hideGenericModal(importModal)
  );
  confirmImportBtn.addEventListener("click", () => {
    try {
      const data = JSON.parse(importDataTextarea.value);
      if (data.backpacksMeta && data.allBackpacksData) {
        backpacksMeta = data.backpacksMeta;
        allBackpacksData = data.allBackpacksData;
        currentBackpackId = data.currentBackpackId || backpacksMeta[0]?.id;
        loadBackpackState(currentBackpackId);
        hideGenericModal(importModal);
        renderAll();
        saveDataToLocalStorage();
        showAlert("Backpack data imported successfully!");
      } else {
        showAlert("Invalid import data structure.");
      }
    } catch (error) {
      showAlert("Failed to parse import data. " + error.message);
    }
  });

  // Context Menu button listeners
  contextDeleteBtn.addEventListener("click", () => {
    if (contextMenuItemInstanceId) {
      removeItemFromBackpack(contextMenuItemInstanceId);
    } else if (contextMenuAvailableItemId) {
      deleteItem(contextMenuAvailableItemId);
    }
    hideContextMenu();
  });

  function getItemToEdit() {
    let itemToEdit = null;

    if (contextMenuItemInstanceId) {
      const placedItem = placedItems.find(
        (p) => p.instanceId === contextMenuItemInstanceId
      );
      if (placedItem) {
        itemToEdit = availableItems.find((a) => a.id === placedItem.itemId);
      }
    } else if (contextMenuAvailableItemId) {
      itemToEdit = availableItems.find(
        (a) => a.id === contextMenuAvailableItemId
      );
    }
    return itemToEdit;
  }

  contextEditNameBtn.addEventListener("click", () => {
    let itemToEdit = getItemToEdit();

    if (itemToEdit) {
      showEditModal("Edit Item Name", "text", itemToEdit.name, (newValue) => {
        const itemIndex = availableItems.findIndex(
          (item) => item.id === itemToEdit.id
        );
        if (itemIndex > -1) {
          availableItems[itemIndex].name = newValue;
          renderAll();
          saveDataToLocalStorage();
          showAlert(`Item name updated to '${newValue}'.`);
        }
      });
    }
    hideContextMenu();
  });

  contextEditACBtn.addEventListener("click", () => {
    const itemToEdit = getItemToEdit();

    if (itemToEdit) {
      showEditModal("Edit AC", "text", itemToEdit.ac, (newValue) => {
        const itemIndex = availableItems.findIndex(
          (item) => item.id === itemToEdit.id
        );
        if (itemIndex > -1) {
          availableItems[itemIndex].ac = newValue;
          renderAll();
          saveDataToLocalStorage();
          showAlert(`Item name updated to '${newValue}'.`);
        }
      });
    }
    hideContextMenu();
  });

  contextEditDamageBtn.addEventListener("click", () => {
    const itemToEdit = getItemToEdit();

    if (itemToEdit) {
      showEditModal("Edit AC", "text", itemToEdit.damage, (newValue) => {
        const itemIndex = availableItems.findIndex(
          (item) => item.id === itemToEdit.id
        );
        if (itemIndex > -1) {
          availableItems[itemIndex].damage = newValue;
          renderAll();
          saveDataToLocalStorage();
          showAlert(`Item name updated to '${newValue}'.`);
        }
      });
    }
    hideContextMenu();
  });

  /**
   * Rotates a 2D array representing a pixel shape by 45 degrees.
   * @param {number[][]} shape - A 2D array containing 0s and 1s.
   * @returns {number[][]} A new 2D array with the rotated shape.
   */
  const rotateShape45 = (shape) => {
    // 1. Handle empty input
    if (!shape || shape.length === 0 || shape[0].length === 0) {
      return [];
    }

    const height = shape.length;
    const width = shape[0].length;
    const centerX = (width - 1) / 2.0;
    const centerY = (height - 1) / 2.0;

    // 2. Get the coordinates of all '1' pixels
    const pixels = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (shape[r][c] === 1) {
          pixels.push({ r, c });
        }
      }
    }

    if (pixels.length === 0) {
      return Array.from({ length: height }, () => Array(width).fill(0));
    }

    // 3. Rotate each pixel's coordinates
    const angle = (90 * Math.PI) / 180; // Convert 45 degrees to radians
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    const rotatedCoords = pixels.map(({ r, c }) => {
      // Translate to origin (center of the shape)
      const x = c - centerX;
      const y = r - centerY;

      // Apply the 2D rotation formula
      const newX = x * cosAngle - y * sinAngle;
      const newY = x * sinAngle + y * cosAngle;

      return { x: newX, y: newY };
    });

    // 4. Find the bounds of the new shape to create the output grid
    const minX = Math.min(...rotatedCoords.map((p) => p.x));
    const maxX = Math.max(...rotatedCoords.map((p) => p.x));
    const minY = Math.min(...rotatedCoords.map((p) => p.y));
    const maxY = Math.max(...rotatedCoords.map((p) => p.y));

    // 5. Calculate new grid dimensions and create it
    const newWidth = Math.ceil(maxX - minX) + 1;
    const newHeight = Math.ceil(maxY - minY) + 1;
    const rotatedShape = Array.from({ length: newHeight }, () =>
      Array(newWidth).fill(0)
    );

    // 6. Map the rotated coordinates to the new integer grid
    for (const { x, y } of rotatedCoords) {
      // Translate coordinates relative to the new grid's top-left corner
      const col = Math.round(x - minX);
      const row = Math.round(y - minY);

      if (row >= 0 && row < newHeight && col >= 0 && col < newWidth) {
        rotatedShape[row][col] = 1;
      }
    }

    return rotatedShape;
  };

  contextEditRotationBtn.addEventListener("click", () => {
    let itemToEditId = null;
    if (contextMenuItemInstanceId) {
      const placedItem = placedItems.find(
        (p) => p.instanceId === contextMenuItemInstanceId
      );
      if (placedItem) {
        itemToEdit = allBackpacksData[currentBackpackId].placedItems.find(
          (a) => a.itemId === placedItem.itemId
        );
        itemToEditId = placedItem.itemId;
        const rotatedShape = rotateShape45(itemToEdit.shape);
        itemToEdit.shape = rotatedShape;
        itemToEdit.width = rotatedShape[0].length;
        itemToEdit.height = rotatedShape.length;

        renderAll();
        saveDataToLocalStorage();
      }
    } else if (contextMenuAvailableItemId) {
      itemToEditId = contextMenuAvailableItemId;
    }

    hideContextMenu();
  });

  contextEditDescriptionBtn.addEventListener("click", () => {
    const itemToEdit = getItemToEdit();

    if (itemToEdit) {
      showEditModal(
        "Edit Item Description",
        "textarea",
        itemToEdit.description,
        (newValue) => {
          const itemIndex = availableItems.findIndex(
            (item) => item.id === itemToEdit.id
          );
          if (itemIndex > -1) {
            availableItems[itemIndex].description = newValue;
            renderAll();
            saveDataToLocalStorage();
            showAlert(`Item description updated.`);
          }
        }
      );
    }
    hideContextMenu();
  });

  contextEditPriceBtn.addEventListener("click", () => {
    const itemToEdit = getItemToEdit();

    if (itemToEdit) {
      showEditModal(
        "Edit Item Price",
        "price",
        itemToEdit.price,
        (newPrice) => {
          const itemIndex = availableItems.findIndex(
            (item) => item.id === itemToEdit.id
          );
          if (itemIndex > -1) {
            availableItems[itemIndex].price = newPrice;
            renderAll();
            saveDataToLocalStorage();
            showAlert(`Item price updated to ${formatPrice(newPrice)}.`);
          }
        }
      );
    }
    hideContextMenu();
  });

  contextEditShapeBtn.addEventListener("click", () => {
    let itemToEditId = null;
    if (contextMenuItemInstanceId) {
      const placedItem = placedItems.find(
        (p) => p.instanceId === contextMenuItemInstanceId
      );
      itemToEditId = placedItem ? placedItem.itemId : null;
    } else if (contextMenuAvailableItemId) {
      itemToEditId = contextMenuAvailableItemId;
    }

    if (itemToEditId) {
      showShapeEditModal(itemToEditId);
    }
    hideContextMenu();
  });

  contextEditColorBtn.addEventListener("click", () => {
    const itemToEdit = getItemToEdit();

    if (itemToEdit) {
      showEditModal(
        "Change Item Color",
        "color",
        itemToEdit.color,
        (newColor) => {
          const itemIndex = availableItems.findIndex(
            (item) => item.id === itemToEdit.id
          );
          if (itemIndex > -1) {
            availableItems[itemIndex].color = newColor;
            renderAll();
            saveDataToLocalStorage();
            showAlert(`Item color changed.`);
          }
        }
      );
    }
    hideContextMenu();
  });

  cancelEditModalBtn.addEventListener("click", hideEditModal);
  confirmEditModalBtn.addEventListener("click", () => {
    if (currentEditCallback) {
      let value;
      if (!editModalInput.classList.contains("hidden"))
        value = editModalInput.value;
      else if (!editModalTextarea.classList.contains("hidden"))
        value = editModalTextarea.value;
      else if (!editModalColorInput.classList.contains("hidden"))
        value = editModalColorInput.value;
      else
        value = {
          cp: parseInt(editPriceCP.value) || 0,
          sp: parseInt(editPriceSP.value) || 0,
          gp: parseInt(editPriceGP.value) || 0,
          pp: parseInt(itemPricePP.value) || 0,
        };
      currentEditCallback(value);
    }
    hideEditModal();
  });

  cancelConfirmModalBtn.addEventListener("click", hideConfirmModal);
  confirmModalBtn.addEventListener("click", () => {
    if (currentConfirmCallback) currentConfirmCallback();
    hideConfirmModal();
  });

  // Event listeners for the new Shape Edit Modal (NEW)
  clearShapeEditBtn.addEventListener("click", () => {
    currentShapeEditModalShape.forEach((row) => row.fill(0));
    renderGenericShapeEditor(
      shapeEditEditor,
      currentShapeEditModalShape,
      (r, c, val) => {
        currentShapeEditModalShape[r][c] = val;
      },
      () =>
        updateGenericCalculatedWeight(
          itemEditBaseWeightInput,
          currentShapeEditModalShape
        ),
      shapeEditModalState
    );
    // No need to save here, as save happens on confirmShapeEditBtn
  });

  fillShapeEditBtn.addEventListener("click", () => {
    currentShapeEditModalShape.forEach((row) => row.fill(1));
    renderGenericShapeEditor(
      shapeEditEditor,
      currentShapeEditModalShape,
      (r, c, val) => {
        currentShapeEditModalShape[r][c] = val;
      },
      () =>
        updateGenericCalculatedWeight(
          itemEditBaseWeightInput,
          currentShapeEditModalShape
        ),
      shapeEditModalState
    );
    // No need to save here, as save happens on confirmShapeEditBtn
  });

  cancelShapeEditModalBtn.addEventListener("click", hideShapeEditModal);

  confirmShapeEditBtn.addEventListener("click", () => {
    if (!editingItemId) {
      showAlert("Error: No item selected for shape editing.");
      hideShapeEditModal();
      return;
    }

    const itemIndex = availableItems.findIndex(
      (item) => item.id === editingItemId
    );
    if (itemIndex === -1) {
      showAlert("Error: Item not found for shape editing.");
      hideShapeEditModal();
      return;
    }

    const {
      shape: newTrimmedShape,
      width: newWidth,
      height: newHeight,
      occupiedCells: newOccupiedCells,
    } = getTrimmedShape(currentShapeEditModalShape);

    if (
      newWidth === 0 ||
      newHeight === 0 ||
      newTrimmedShape.flat().every((cell) => cell === 0)
    ) {
      showAlert(
        "Please define a shape for the item by clicking cells in the editor."
      );
      return;
    }
    if (newWidth > SHAPE_EDITOR_SIZE || newHeight > SHAPE_EDITOR_SIZE) {
      showAlert(
        `New shape (${newWidth}x${newHeight}) exceeds the maximum creation size of ${SHAPE_EDITOR_SIZE}x${SHAPE_EDITOR_SIZE}.`
      );
      return;
    }

    // Update the original item in availableItems
    availableItems[itemIndex].shape = newTrimmedShape;
    availableItems[itemIndex].width = newWidth;
    availableItems[itemIndex].height = newHeight;
    availableItems[itemIndex].baseWeight = newOccupiedCells * WEIGHT_PER_SQUARE;

    // Update all instances of this item in placedItems across ALL backpacks
    const originalItemName = availableItems[itemIndex].name;
    let totalRemovedInstancesCount = 0;

    for (const bpId in allBackpacksData) {
      const bpData = allBackpacksData[bpId];
      const placedItemsInThisBp = bpData.placedItems;
      let removedInstancesInThisBp = 0;
      const updatedPlacedItemsInThisBp = [];

      const tempStrength = bpData.strengthScore;
      const tempCreatureSize = bpData.creatureSize;
      const baseCarryingCapacity = tempStrength * 15;
      const sizeMultiplier = CREATURE_SIZE_MULTIPLIERS[tempCreatureSize] || 1;
      const currentBpMaxWeight = baseCarryingCapacity * sizeMultiplier;
      const currentBpMaxSquares = Math.floor(
        currentBpMaxWeight / WEIGHT_PER_SQUARE
      );
      let currentBpSideLength = Math.ceil(Math.sqrt(currentBpMaxSquares));
      if (currentBpSideLength === 0) currentBpSideLength = 1;
      currentBpSideLength = Math.min(
        currentBpSideLength,
        MAX_LOGICAL_GRID_SIDE
      );

      for (const pItem of placedItemsInThisBp) {
        if (pItem.itemId === editingItemId) {
          const tempItemForCheck = {
            shape: newTrimmedShape,
            width: newWidth,
            height: newHeight,
          };

          const tempGrid = Array(currentBpSideLength)
            .fill(null)
            .map(() => Array(currentBpSideLength).fill(null));
          placedItemsInThisBp.forEach((otherPItem) => {
            if (otherPItem.instanceId !== pItem.instanceId) {
              const otherItemData = availableItems.find(
                (a) => a.id === otherPItem.itemId
              );
              if (otherItemData && otherPItem.shape) {
                for (let r = 0; r < otherPItem.height; r++) {
                  for (let c = 0; c < otherPItem.width; c++) {
                    if (otherPItem.shape[r] && otherPItem.shape[r][c] === 1) {
                      if (
                        otherPItem.row + r < currentBpSideLength &&
                        otherPItem.col + c < currentBpSideLength
                      ) {
                        tempGrid[otherPItem.row + r][otherPItem.col + c] =
                          otherPItem.instanceId;
                      }
                    }
                  }
                }
              }
            }
          });

          if (
            pItem.row + newHeight <= currentBpSideLength &&
            pItem.col + newWidth <= currentBpSideLength &&
            checkOverlap(
              tempItemForCheck,
              pItem.row,
              pItem.col,
              tempGrid,
              pItem.instanceId
            )
          ) {
            updatedPlacedItemsInThisBp.push({
              ...pItem,
              shape: newTrimmedShape,
              width: newWidth,
              height: newHeight,
            });
          } else {
            removedInstancesInThisBp++;
          }
        } else {
          updatedPlacedItemsInThisBp.push(pItem);
        }
      }
      allBackpacksData[bpId].placedItems = updatedPlacedItemsInThisBp;
      totalRemovedInstancesCount += removedInstancesInThisBp;
    }

    if (totalRemovedInstancesCount > 0) {
      showAlert(
        `Shape for '${originalItemName}' updated. ${totalRemovedInstancesCount} instance(s) removed from backpack(s) due to new shape not fitting.`
      );
    } else {
      showAlert(`Shape for '${originalItemName}' updated successfully.`);
    }

    hideShapeEditModal();
    renderAll(); // Re-render the entire UI
    saveDataToLocalStorage(); // Save after shape edit
  });

  saveToSheetBtn.addEventListener("click", saveDataToGoogleSheet);
  loadFromSheetBtn.addEventListener("click", loadDataFromGoogleSheet);
});
