(function () {
  const STORE_KEY = "laudo-demo-reports-v2";
  const SESSION_KEY = "laudo-demo-session-v1";
  const SIGNING_KEY = "laudo-demo-signing-key";

  const ADMIN_USER = "kauitooficina";
  const ADMIN_PASSWORD = "4205169";

  const baseTemplate = {
    ownerName: "",
    phone: "",
    email: "",
    serial: "",
    equipment: "",
    maintenanceStatus: "Em manutencao",
    manufactureDate: "",
    extradorsoColor: "",
    intradorsoColor: "",
    inspectionDate: "",
    nextInspectionDate: "",
    porosityLeft: "",
    porosityCenterLeft: "",
    porosityCenter: "",
    porosityCenterRight: "",
    porosityRight: "",
    porosityAverage: "",
    strapA: "",
    strapB: "",
    strapC: "",
    strapD: "",
    strapRegulation: "",
    strapChange: "",
    mosquetinhos: "",
    roldanas: "",
    magneticos: "",
    acelerador: "",
    strapNotes: "",
    lineCheck: "",
    lineTrim: "",
    lineIssues: "",
    lineSwap: "",
    lineLoad: "",
    lineSwapped: "",
    lineSymmetry: "",
    lineNotes: "",
    tissueProfileCheck: "",
    tissueIssues1: "",
    tissueExtradorso: "",
    tissueIntradorso: "",
    tissueIssues2: "",
    tissueCleaning: "",
    tissueIssues3: "",
    tissueStrength: "",
    tissueIssues4: "",
    tissueNotes: "",
    galleryItems: [],
  };

  function getStore() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      return {};
    }
  }

  function setStore(value) {
    localStorage.setItem(STORE_KEY, JSON.stringify(value));
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function setSession(user) {
    if (!user) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const keys = Object.keys(value).sort();
      const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
      return `{${pairs.join(",")}}`;
    }

    return JSON.stringify(value);
  }

  async function sha256(text) {
    const encoded = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);

    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function sanitizeText(value, max = 500) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function calculateAverage(payload) {
    const values = [
      Number.parseFloat(payload.porosityLeft),
      Number.parseFloat(payload.porosityCenterLeft),
      Number.parseFloat(payload.porosityCenter),
      Number.parseFloat(payload.porosityCenterRight),
      Number.parseFloat(payload.porosityRight),
    ];

    const hasAnyValue = values.some((value) => Number.isFinite(value));
    if (!hasAnyValue) {
      return "";
    }

    const sum = values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
    return (sum / 5).toFixed(1);
  }

  function sanitizePayload(payload, serial) {
    const clean = {};

    for (const key of Object.keys(baseTemplate)) {
      const value = payload?.[key];

      if (key === "maintenanceStatus") {
        clean.maintenanceStatus = value === "Finalizada" ? "Finalizada" : "Em manutencao";
        continue;
      }

      if (key === "galleryItems") {
        clean.galleryItems = Array.isArray(value)
          ? value
              .slice(0, 20)
              .map((item) => ({
                id: sanitizeText(item?.id, 80),
                description: sanitizeText(item?.description, 240),
                imageData:
                  typeof item?.imageData === "string" && item.imageData.startsWith("data:image/")
                    ? item.imageData.slice(0, 2_000_000)
                    : "",
              }))
              .filter((item) => item.id && item.imageData)
          : [];
        continue;
      }

      clean[key] = sanitizeText(value);
    }

    clean.serial = serial;
    clean.porosityAverage = calculateAverage(clean);

    return clean;
  }

  async function signReport({ serial, payload, updatedAt }) {
    const normalizedPayload = stableStringify(payload);
    const base = `${SIGNING_KEY}|${serial}|${updatedAt}|${normalizedPayload}`;
    return sha256(base);
  }

  async function login(username, password) {
    if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      throw new Error("Credenciais invalidas.");
    }

    const user = { id: 1, username: ADMIN_USER, role: "admin" };
    setSession(user);
    return { user };
  }

  async function logout() {
    setSession(null);
    return { success: true };
  }

  async function getAdminReport(serial) {
    const trimmedSerial = String(serial || "").trim();
    if (!trimmedSerial) {
      throw new Error("Serial invalido.");
    }

    const store = getStore();
    const existing = store[trimmedSerial];

    if (!existing) {
      return {
        serial: trimmedSerial,
        payload: sanitizePayload({ serial: trimmedSerial }, trimmedSerial),
        exists: false,
      };
    }

    return {
      ...existing,
      exists: true,
    };
  }

  async function saveAdminReport(serial, payload) {
    const session = getSession();
    if (!session) {
      throw new Error("Nao autenticado.");
    }

    const trimmedSerial = String(serial || "").trim();
    if (!trimmedSerial) {
      throw new Error("Serial invalido.");
    }

    const cleanPayload = sanitizePayload(payload, trimmedSerial);
    const updatedAt = new Date().toISOString();
    const signedHash = await signReport({ serial: trimmedSerial, payload: cleanPayload, updatedAt });

    const report = {
      serial: trimmedSerial,
      payload: cleanPayload,
      signedHash,
      updatedBy: session.username,
      updatedAt,
      createdAt: updatedAt,
    };

    const store = getStore();
    store[trimmedSerial] = report;
    setStore(store);

    return {
      message: "Laudo salvo com sucesso.",
      report,
      authentic: true,
    };
  }

  async function getPublicReport(serial) {
    const trimmedSerial = String(serial || "").trim();
    if (!trimmedSerial) {
      throw new Error("Serial invalido.");
    }

    const store = getStore();
    const report = store[trimmedSerial];

    if (!report) {
      throw new Error("Laudo nao encontrado.");
    }

    const expectedHash = await signReport({
      serial: report.serial,
      payload: report.payload,
      updatedAt: report.updatedAt,
    });

    return {
      serial: report.serial,
      payload: report.payload,
      signedHash: report.signedHash,
      updatedBy: report.updatedBy,
      updatedAt: report.updatedAt,
      authentic: expectedHash === report.signedHash,
    };
  }

  window.DemoStore = {
    credentials: {
      username: ADMIN_USER,
      password: ADMIN_PASSWORD,
    },
    getSession,
    login,
    logout,
    getAdminReport,
    saveAdminReport,
    getPublicReport,
  };
})();
