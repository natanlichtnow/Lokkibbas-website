const lookupForm = document.getElementById("lookup-form");
const serialInput = document.getElementById("serial-input");
const report = document.getElementById("public-report");
const authStatus = document.getElementById("auth-status");
const serviceStatus = document.getElementById("service-status");
const downloadPdfButton = document.getElementById("download-pdf");
const publicGallery = document.getElementById("public-gallery");
const galleryModal = document.getElementById("gallery-modal");
const galleryModalImage = document.getElementById("gallery-modal-image");
const galleryModalCaption = document.getElementById("gallery-modal-caption");
const galleryModalClose = document.getElementById("gallery-modal-close");

let currentSerial = "";
let currentGalleryItems = [];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function computePorosityAverage(payload) {
  const values = [
    Number.parseFloat(payload?.porosityLeft),
    Number.parseFloat(payload?.porosityCenterLeft),
    Number.parseFloat(payload?.porosityCenter),
    Number.parseFloat(payload?.porosityCenterRight),
    Number.parseFloat(payload?.porosityRight),
  ];

  const hasAnyValue = values.some((value) => Number.isFinite(value));
  if (!hasAnyValue) {
    return "";
  }

  const sum = values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
  return (sum / 5).toFixed(1);
}

function fillReport(payload) {
  const maintenanceStatus = payload?.maintenanceStatus === "Finalizada" ? "Finalizada" : "Em manutencao";

  const normalizedPayload = {
    ...payload,
    maintenanceStatus,
    porosityAverage: computePorosityAverage(payload),
  };

  const outputFields = Array.from(document.querySelectorAll("[data-out]"));
  const porosityNodes = Array.from(document.querySelectorAll("[data-porosity-node]"));
  const serialNoteNodes = Array.from(document.querySelectorAll("[data-serial-note]"));

  for (const out of outputFields) {
    const key = out.dataset.out;
    const value = normalizedPayload[key] || "-";
    out.textContent = value;
  }

  porosityNodes.forEach((node) => {
    const key = node.dataset.porosityNode;
    node.textContent = normalizedPayload[key] || "-";
  });

  serialNoteNodes.forEach((node) => {
    node.textContent = currentSerial || "-";
  });

  serviceStatus.classList.remove("hidden", "service-status--in-progress", "service-status--done");
  serviceStatus.classList.add(
    maintenanceStatus === "Finalizada" ? "service-status--done" : "service-status--in-progress"
  );
  serviceStatus.textContent =
    maintenanceStatus === "Finalizada"
      ? "Status do parapente: manutencao finalizada"
      : "Status do parapente: em manutencao";
}

function renderGallery(items) {
  currentGalleryItems = Array.isArray(items) ? items : [];

  if (!Array.isArray(items) || !items.length) {
    publicGallery.innerHTML = '<li class="gallery__empty">Nenhuma foto registrada.</li>';
    return;
  }

  publicGallery.innerHTML = items
    .map(
      (item, index) => `
      <li class="gallery__item">
        <button class="gallery__thumb" type="button" data-open-gallery-index="${index}" aria-label="Abrir imagem em destaque">
          <img class="gallery__image" src="${escapeHtml(item.imageData)}" alt="Reparo" />
          <span class="gallery__caption">${escapeHtml(item.description || "Sem descricao")}</span>
        </button>
        <span class="gallery__description">${escapeHtml(item.description || "Sem descricao")}</span>
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

function showAuth({ authentic, signedHash, updatedAt, updatedBy }) {
  authStatus.classList.remove("hidden", "authenticity--ok", "authenticity--bad");
  authStatus.classList.add(authentic ? "authenticity--ok" : "authenticity--bad");

  const shortHash = `${signedHash.slice(0, 10)}...${signedHash.slice(-8)}`;
  authStatus.textContent = authentic
    ? `Documento autentico. Hash: ${shortHash}. Atualizado por ${updatedBy} em ${new Date(updatedAt).toLocaleString("pt-BR")}.`
    : "Atencao: assinatura invalida. Documento pode ter sido adulterado.";
}

async function loadReport(serial) {
  const data = await window.DemoStore.getPublicReport(serial);

  currentSerial = data.serial;
  fillReport(data.payload || {});
  renderGallery(data.payload?.galleryItems || []);
  showAuth(data);
  report.classList.remove("hidden");
  downloadPdfButton.disabled = false;
}

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const serial = serialInput.value.trim();
  if (!serial) {
    return;
  }

  authStatus.classList.remove("hidden", "authenticity--ok");
  authStatus.classList.add("authenticity--bad");
  authStatus.textContent = "Consultando...";

  try {
    await loadReport(serial);
  } catch (error) {
    report.classList.add("hidden");
    downloadPdfButton.disabled = true;
    serviceStatus.classList.add("hidden");
    authStatus.textContent = error.message;
  }
});

downloadPdfButton.addEventListener("click", () => {
  if (!currentSerial) {
    return;
  }

  window.print();
});

publicGallery.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-gallery-index]");
  if (!openButton) {
    return;
  }

  const index = Number.parseInt(openButton.dataset.openGalleryIndex, 10);
  const item = currentGalleryItems[index];
  if (!item) {
    return;
  }

  openGalleryModal(item.imageData, item.description);
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
