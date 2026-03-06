(function () {
  const form = document.getElementById("lookup-form");
  const serialInput = document.getElementById("serial");
  const report = document.getElementById("report");
  const status = document.getElementById("status");
  const auth = document.getElementById("auth");

  const outputs = Array.from(document.querySelectorAll("[data-out]"));

  function fill(payload) {
    outputs.forEach((el) => {
      const key = el.dataset.out;
      el.textContent = payload[key] || "-";
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const serial = serialInput.value.trim();
    if (!serial) {
      return;
    }

    status.textContent = "Consultando laudo demo...";

    const data = await window.DemoStore.get(serial);

    if (!data) {
      report.classList.add("report--hidden");
      status.textContent = "Laudo nao encontrado para este serial.";
      return;
    }

    fill(data.payload);
    report.classList.remove("report--hidden");
    status.textContent = "Laudo encontrado.";

    const shortHash = `${data.signedHash.slice(0, 10)}...${data.signedHash.slice(-8)}`;
    auth.classList.remove("auth--ok", "auth--bad");

    if (data.authentic) {
      auth.classList.add("auth--ok");
      auth.textContent = `Autentico (demo). Hash: ${shortHash}. Ultima atualizacao: ${new Date(data.updatedAt).toLocaleString("pt-BR")}.`;
    } else {
      auth.classList.add("auth--bad");
      auth.textContent = "Invalido: assinatura nao confere.";
    }
  });
})();
