(function () {
  const loginPanel = document.getElementById("login-panel");
  const editorPanel = document.getElementById("editor-panel");
  const editorForm = document.getElementById("editor-form");

  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");

  const serialInput = document.getElementById("serial");
  const loadButton = document.getElementById("load-report");
  const logoutButton = document.getElementById("logout");
  const editorStatus = document.getElementById("editor-status");

  const fields = Array.from(document.querySelectorAll("[data-field]"));
  let currentSerial = "";
  let saveTimer = null;

  function setAuth(on) {
    loginPanel.classList.toggle("panel--hidden", on);
    editorPanel.classList.toggle("panel--hidden", !on);
    editorForm.classList.toggle("report--hidden", !on);
  }

  function fill(payload) {
    fields.forEach((field) => {
      field.value = payload[field.dataset.field] || "";
    });
  }

  function payloadFromForm() {
    const payload = {};
    fields.forEach((field) => {
      payload[field.dataset.field] = field.value;
    });
    return payload;
  }

  async function saveNow() {
    if (!currentSerial) {
      return;
    }

    const saved = await window.DemoStore.upsert(currentSerial, payloadFromForm(), "demo-admin");
    editorStatus.textContent = `Salvo localmente em ${new Date(saved.updatedAt).toLocaleTimeString("pt-BR")}.`;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveNow();
    }, 500);
  }

  async function loadReport() {
    const serial = serialInput.value.trim();

    if (!serial) {
      editorStatus.textContent = "Informe um numero de serie.";
      return;
    }

    currentSerial = serial;
    const data = await window.DemoStore.get(serial);

    if (data) {
      fill(data.payload);
      editorStatus.textContent = "Laudo demo carregado.";
    } else {
      fill({ ...window.DemoStore.emptyReport, serial });
      editorStatus.textContent = "Novo laudo demo iniciado.";
    }
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value;

    if (user === window.DemoStore.credentials.user && pass === window.DemoStore.credentials.password) {
      loginStatus.textContent = "Login demo aprovado.";
      setAuth(true);
      return;
    }

    loginStatus.textContent = "Credenciais demo invalidas.";
  });

  loadButton.addEventListener("click", () => {
    loadReport();
  });

  logoutButton.addEventListener("click", () => {
    currentSerial = "";
    fill(window.DemoStore.emptyReport);
    setAuth(false);
    editorStatus.textContent = "";
  });

  fields.forEach((field) => {
    field.addEventListener("input", scheduleSave);
  });

  setAuth(false);
})();
