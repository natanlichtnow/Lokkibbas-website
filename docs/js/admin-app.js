const state = {
  currentSerial: "",
  saveTimer: null,
  galleryItems: [],
};

const loginPanel = document.getElementById("login-panel");
const editorPanel = document.getElementById("editor-panel");
const adminForm = document.getElementById("admin-form");

const loginStatus = document.getElementById("login-status");
const editorStatus = document.getElementById("editor-status");

const loginForm = document.getElementById("login-form");
const serialInput = document.getElementById("editor-serial");
const loadButton = document.getElementById("load-report");
const logoutButton = document.getElementById("logout");
const downloadPdfButton = document.getElementById("download-pdf");

const addGalleryButton = document.getElementById("add-gallery-item");
const galleryFileInput = document.getElementById("gallery-file");
const galleryDescriptionInput = document.getElementById("gallery-description");
const galleryList = document.getElementById("admin-gallery");
const galleryModal = document.getElementById("gallery-modal");
const galleryModalImage = document.getElementById("gallery-modal-image");
const galleryModalCaption = document.getElementById("gallery-modal-caption");
const galleryModalClose = document.getElementById("gallery-modal-close");

const fieldInputs = Array.from(document.querySelectorAll("[data-field]"));
const porosityNodes = Array.from(document.querySelectorAll("[data-porosity-node]"));
const serialNoteNodes = Array.from(document.querySelectorAll("[data-serial-note]"));
const porosityPointKeys = [
  "porosityLeft",
  "porosityCenterLeft",
  "porosityCenter",
  "porosityCenterRight",
  "porosityRight",
];

function getFieldInput(fieldKey) {
  return fieldInputs.find((input) => input.dataset.field === fieldKey);
}

function updatePorosityAverageField() {
  const numericValues = porosityPointKeys.map((key) => Number.parseFloat(getFieldInput(key)?.value || ""));
  const hasAnyValue = numericValues.some((value) => Number.isFinite(value));

  const averageInput = getFieldInput("porosityAverage");
  if (!averageInput) {
    return;
  }

  if (!hasAnyValue) {
    averageInput.value = "";
    return;
  }

  const sum = numericValues.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
  const average = sum / 5;
  averageInput.value = average.toFixed(1);
}

function setStatus(el, message) {
  el.textContent = message;
}

function setEditorVisibility(visible) {
  loginPanel.classList.toggle("hidden", visible);
  editorPanel.classList.toggle("hidden", !visible);
  adminForm.classList.toggle("hidden", !visible);
  downloadPdfButton.disabled = !visible || !state.currentSerial;
}

function updateSerialNotes() {
  const serial = state.currentSerial || "-";
  serialNoteNodes.forEach((node) => {
    node.textContent = serial;
  });
}

function updatePorosityOverlay(payload) {
  porosityNodes.forEach((node) => {
    const key = node.dataset.porosityNode;
    const value = payload?.[key] || "-";
    node.textContent = String(value);
  });
}

function payloadFromForm() {
  updatePorosityAverageField();

  const payload = {};
  for (const input of fieldInputs) {
    payload[input.dataset.field] = input.value;
  }
  payload.galleryItems = state.galleryItems;
  return payload;
}

function fillForm(payload) {
  for (const input of fieldInputs) {
    input.value = payload[input.dataset.field] || "";
  }

  updatePorosityAverageField();

  state.galleryItems = Array.isArray(payload.galleryItems) ? payload.galleryItems : [];
  renderGallery();
  updatePorosityOverlay(payloadFromForm());
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderGallery() {
  if (!state.galleryItems.length) {
    galleryList.innerHTML = '<li class="gallery__empty">Nenhuma foto adicionada.</li>';
    return;
  }

  galleryList.innerHTML = state.galleryItems
    .map(
      (item) => `
      <li class="gallery__item" data-gallery-id="${escapeHtml(item.id)}">
        <button class="gallery__thumb" type="button" data-open-gallery="${escapeHtml(item.id)}" aria-label="Abrir imagem em destaque">
          <img class="gallery__image" src="${escapeHtml(item.imageData)}" alt="Foto do reparo" />
          <span class="gallery__caption">${escapeHtml(item.description || "Sem descricao")}</span>
        </button>
        <span class="gallery__description">${escapeHtml(item.description || "Sem descricao")}</span>
        <button class="button button--ghost" type="button" data-remove-gallery="${escapeHtml(item.id)}">Remover</button>
      </li>
    `
    )
    .join("");
}

function openGalleryModal(imageData, description) {
  galleryModalImage.src = imageData;
  galleryModalCaption.textContent = description || "Sem descricao";
  galleryModal.classList.remove("hidden");
}

function closeGalleryModal() {
  galleryModal.classList.add("hidden");
  galleryModalImage.src = "";
  galleryModalCaption.textContent = "";
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function optimizeImage(file) {
  const originalDataUrl = await toDataUrl(file);
  const image = await loadImage(originalDataUrl);

  const maxDimension = 1600;
  const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", 0.82);
}

async function checkSession() {
  const user = window.DemoStore.getSession();
  setEditorVisibility(Boolean(user));
}

async function login(event) {
  event.preventDefault();
  setStatus(loginStatus, "Autenticando...");

  try {
    await window.DemoStore.login(
      document.getElementById("username").value,
      document.getElementById("password").value
    );

    setStatus(loginStatus, "Login realizado.");
    setEditorVisibility(true);
  } catch (error) {
    setStatus(loginStatus, error.message);
  }
}

async function logout() {
  await window.DemoStore.logout();
  state.currentSerial = "";
  state.galleryItems = [];
  fillForm({});
  setEditorVisibility(false);
  setStatus(editorStatus, "Sessao encerrada.");
  updateSerialNotes();
}

async function loadReport() {
  const serial = serialInput.value.trim();

  if (!serial) {
    setStatus(editorStatus, "Informe um numero de serie.");
    return;
  }

  setStatus(editorStatus, "Carregando laudo...");

  try {
    const data = await window.DemoStore.getAdminReport(serial);

    state.currentSerial = serial;
    fillForm(data.payload || {});
    updateSerialNotes();
    downloadPdfButton.disabled = false;

    setStatus(editorStatus, data.exists ? "Laudo carregado." : "Novo laudo criado em memoria. Comece a preencher.");
  } catch (error) {
    setStatus(editorStatus, error.message);
  }
}

async function saveReport() {
  if (!state.currentSerial) {
    return;
  }

  const payload = payloadFromForm();

  try {
    await window.DemoStore.saveAdminReport(state.currentSerial, payload);

    setStatus(editorStatus, `Salvo em ${new Date().toLocaleTimeString("pt-BR")}.`);
  } catch (error) {
    setStatus(editorStatus, error.message);
  }
}

function onFieldChange() {
  updatePorosityAverageField();
  updatePorosityOverlay(payloadFromForm());

  if (!state.currentSerial) {
    return;
  }

  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    saveReport();
  }, 650);
}

async function addGalleryItem() {
  if (!state.currentSerial) {
    setStatus(editorStatus, "Carregue um laudo antes de adicionar fotos.");
    return;
  }

  const file = galleryFileInput.files?.[0];
  const description = galleryDescriptionInput.value.trim();

  if (!file) {
    setStatus(editorStatus, "Selecione uma foto para adicionar na galeria.");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    setStatus(editorStatus, "Arquivo muito grande. Use fotos de ate 20MB.");
    return;
  }

  let imageData;
  try {
    imageData = await optimizeImage(file);
  } catch (_error) {
    setStatus(editorStatus, "Nao foi possivel processar esta imagem.");
    return;
  }

  state.galleryItems.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    description,
    imageData,
  });

  renderGallery();
  galleryFileInput.value = "";
  galleryDescriptionInput.value = "";

  try {
    await saveReport();
  } catch (_error) {
    // saveReport already reports errors in the status area.
  }
}

function removeGalleryItem(itemId) {
  state.galleryItems = state.galleryItems.filter((item) => item.id !== itemId);
  renderGallery();
  saveReport();
}

loginForm.addEventListener("submit", login);
loadButton.addEventListener("click", loadReport);
logoutButton.addEventListener("click", logout);
fieldInputs.forEach((input) => {
  input.addEventListener("input", onFieldChange);
  input.addEventListener("change", onFieldChange);
});
addGalleryButton.addEventListener("click", addGalleryItem);

galleryList.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-gallery]");
  if (openButton) {
    const item = state.galleryItems.find((entry) => entry.id === openButton.dataset.openGallery);
    if (item) {
      openGalleryModal(item.imageData, item.description);
    }
    return;
  }

  const button = event.target.closest("[data-remove-gallery]");
  if (!button) {
    return;
  }

  removeGalleryItem(button.dataset.removeGallery);
});

downloadPdfButton.addEventListener("click", () => {
  if (!state.currentSerial) {
    return;
  }

  window.print();
});

galleryModalClose.addEventListener("click", closeGalleryModal);
galleryModal.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-modal-close")) {
    closeGalleryModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !galleryModal.classList.contains("hidden")) {
    closeGalleryModal();
  }
});

updateSerialNotes();
checkSession();
