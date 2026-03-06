(function () {
  const DEMO_USER = "demo-admin";
  const DEMO_PASSWORD = "demo-123";
  const STORE_KEY = "parapente-demo-reports-v1";
  const SIGN_KEY = "demo-sign-key-github-pages";

  const emptyReport = {
    ownerName: "",
    phone: "",
    email: "",
    serial: "",
    equipment: "",
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

  function saveStore(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  async function sha256(text) {
    const encoded = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sign(serial, payload, updatedAt) {
    const base = `${SIGN_KEY}|${serial}|${updatedAt}|${JSON.stringify(payload)}`;
    return sha256(base);
  }

  async function upsert(serial, payload, updatedBy) {
    const store = getStore();
    const clean = { ...emptyReport, ...payload, serial };
    const updatedAt = new Date().toISOString();
    const signedHash = await sign(serial, clean, updatedAt);

    store[serial] = {
      serial,
      payload: clean,
      updatedBy,
      updatedAt,
      signedHash,
    };

    saveStore(store);
    return store[serial];
  }

  async function get(serial) {
    const store = getStore();
    const data = store[serial] || null;
    if (!data) {
      return null;
    }

    const valid = (await sign(data.serial, data.payload, data.updatedAt)) === data.signedHash;
    return { ...data, authentic: valid };
  }

  window.DemoStore = {
    credentials: {
      user: DEMO_USER,
      password: DEMO_PASSWORD,
    },
    emptyReport,
    upsert,
    get,
  };
})();
