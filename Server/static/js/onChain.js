document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("onchainForm");
  const addPanelBtn = document.getElementById("onc_addTokenSearch");
  const newQueryBtn = document.getElementById("onc_newQuery");
  const inputContainer = document.getElementById("input-groups-container");

  // Eventos
  form.addEventListener("submit", ev => {
    ev.preventDefault();
    onc_consult();
  });

  inputContainer.addEventListener("input", () => onc_addPanelRefresh(inputContainer, addPanelBtn));

  addPanelBtn.addEventListener("click", () => {
    onc_addTokenPanel(inputContainer, addPanelBtn);
  });

  newQueryBtn.addEventListener("click", () => {
    onc_newQuery(inputContainer, addPanelBtn);
  });

  // Estado inicial
  onc_addPanelRefresh(inputContainer, addPanelBtn);  
});

function onc_validateControls(group) {
  const tokens = group.querySelector('input[type="text"]').value.trim();
  const chains = group.querySelector("select").value.trim();
  const [dateFrom, dateTo] = group.querySelectorAll('input[type="datetime-local"]');
  return tokens && chains && dateFrom?.value && dateTo?.value;
}

function onc_addPanelRefresh(container, btn) {
  const groups = container.querySelectorAll(".input-group");
  const maxed = groups.length >= 6;
  const completo = onc_validateControls(groups[groups.length - 1]);

  btn.disabled = maxed || !completo;
  btn.style.display = maxed ? "none" : "inline-block";
  btn.style.backgroundColor = (!maxed && completo) ? "#2196f3" : "#555";
  btn.style.cursor = (!maxed && completo) ? "pointer" : "not-allowed";
}

function onc_addTokenPanel(container, btn) {
  const groups = container.querySelectorAll(".input-group");
  if (groups.length >= 6 || btn.disabled) return;

  const newGroup = groups[0].cloneNode(true);

  newGroup.querySelector('input[type="text"]').value = "";
  newGroup.querySelector("select").selectedIndex = 0;
  newGroup.querySelectorAll('input[type="datetime-local"]').forEach(i => i.value = "");

  newGroup.addEventListener("input", () => onc_addPanelRefresh(container, btn));

  container.appendChild(newGroup);

  btn.disabled = true;
  btn.style.backgroundColor = "#555";
  btn.style.cursor = "not-allowed";

  newGroup.querySelector('input[type="text"]').focus();
}

function onc_addTokenPanel(container, btn) {
  const groups = container.querySelectorAll(".input-group");
  if (groups.length >= 6 || btn.disabled) return;

  const newGroup = groups[0].cloneNode(true);

  newGroup.querySelector('input[type="text"]').value = "";
  newGroup.querySelector("select").selectedIndex = 0;
  newGroup.querySelector('input[name="onc_fromDate"]').value = "";
  newGroup.querySelector('input[name="onc_toDate"]').value = "";

  newGroup.querySelectorAll("input, select, label, p").forEach(el => {
    if (el.id && !el.id.startsWith("clone_")) el.id = "";
  });

  newGroup.addEventListener("input", () => onc_addPanelRefresh(container, btn));
  container.appendChild(newGroup);
  
  btn.disabled = true;
  btn.style.backgroundColor = "#555";
  btn.style.cursor = "not-allowed";
  
  const firstInput = newGroup.querySelector('input[type="text"]');
  if (firstInput) firstInput.focus();
}

function onc_newQuery(container) {
  const groups = container.querySelectorAll(".input-group");
  groups.forEach((group, idx) => {
    if (idx > 0) group.remove();
  });

  const firstGroup = document.querySelector(".input-group");
  if (firstGroup) {
    const tokenInput = firstGroup.querySelector('input[type="text"]');
    const chainSelect = firstGroup.querySelector("select");
    const fromInput = firstGroup.querySelector('input[name="onc_fromDate"]') || firstGroup.querySelector('input[type="datetime-local"]:nth-of-type(1)');
    const toInput = firstGroup.querySelector('input[name="onc_toDate"]') || firstGroup.querySelector('input[type="datetime-local"]:nth-of-type(2)');

    if (tokenInput) tokenInput.value = "";
    if (chainSelect) chainSelect.selectedIndex = 0;
    if (fromInput) fromInput.value = "";
    if (toInput) toInput.value = "";
  }

  utl_fadeOutPanel(document.getElementById("onc_summaryPanel"), () => {
    utl_fadeInPanel(document.querySelector(".input-groups-wrapper"));
  });

  document.getElementById("onc_newQuery").style.display = "none";
  document.getElementById("onc_resultsPanel").innerHTML = "";
  document.getElementById("onc_resultsPanel").classList.add("hidden");
}

async function onc_consult() {
  const inputGroups = document.querySelectorAll("#input-groups-container .input-group");
  const panelsData = [];

  for (const group of inputGroups) {
    const token = group.querySelector('input[type="text"]').value.trim();
    const chain = group.querySelector('select').value.trim();
    const fromDateRaw = group.querySelector('input[type="datetime-local"][name="onc_fromDate"]').value;
    const toDateRaw = group.querySelector('input[type="datetime-local"][name="onc_toDate"]').value;

    const fromDate = oncValidateSeconds(fromDateRaw);
    const toDate = oncValidateSeconds(toDateRaw);

    // Validación básica
    if (!token || !chain || !fromDate || !toDate) {
      ntf_setStatus(Enums.STT.ERROR, "Todos los campos son obligatorios en cada panel.");
      return;
    }

    // Validar fechas para cada panel (si utl_validateDates se puede usar dinámicamente)
    if (!utl_validateDates(
          group.querySelector('input[type="datetime-local"][name="onc_fromDate"]'),
          group.querySelector('input[type="datetime-local"][name="onc_toDate"]'),
          group.querySelector('[name="onc_dateMsg"]')
        )) {
      ntf_setStatus(Enums.STT.ERROR, "Fechas inválidas en uno de los paneles.");
      return;
    }

    panelsData.push({
      token_address: token,
      chain,
      from: fromDate,
      to: toDate
    });
  }

  onc_showSummary();
  ntf_setStatus(Enums.STT.WARNING, "Consultando datos...");

  try {
    const response = await fetch('/onChainTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(panelsData)
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.error || "Error desconocido del servidor.";
      ntf_setStatus(Enums.STT.ERROR, errorMsg);
      return;
    }
    if (Array.isArray(data) && data.length > 0) {
      onc_showResults(data);
      ntf_setStatus(Enums.STT.OK, "Consulta completada con éxito.");
    } else {
      ntf_setStatus(Enums.STT.WARNING, "No se encontraron resultados.");
    }
  } catch (err) {    
    ntf_setStatus(Enums.STT.ERROR, "Fallo en la consulta: " + err.message);
  }
}

function onc_showResults(items) {
  const list = document.getElementById("onc_resultsPanel");
  list.innerHTML = "";
  list.classList.remove("hidden");

  const subCategoryMap = {
    0: "Nueva posición",
    1: "Acumulación",
    2: "Venta parcial",
    3: "Venta total"
  };

  if (!items.length) {
    list.innerHTML = "<p>No se encontraron resultados.</p>";
    document.getElementById("onc_newQuery").style.display = "inline-block";
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Fecha</th>
      <th>Categoría</th>
      <th>Wallet</th>
      <th>Cantidad</th>
      <th>USD</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  try{
    items.forEach(item => {
      const row = document.createElement("tr");

      const fecha = new Date(item.block_timestamp).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      });

      const subCat = subCategoryMap[item.sub_category] || "Desconocido";
      const tokenAmtRaw = parseFloat(item.token_amount);
      const tokenAmt = tokenAmtRaw.toLocaleString("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 15
      });

      const usdRaw = Number(item.usd_amount);
      const usdAmt = (Math.abs(usdRaw) < 0.01 ? ">" : "") + usdRaw.toFixed(2).toLocaleString("es-ES");

      row.innerHTML = `
        <td>${fecha}</td>
        <td>${subCat}</td>
        <td style="font-family: monospace;">${item.wallet_address}</td>
        <td style="text-align: right;">${tokenAmt}</td>
        <td style="text-align: right;">${usdAmt === ">" ? ">" : "$" + usdAmt}</td>
      `;

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    list.appendChild(table);

    document.getElementById("onc_newQuery").style.display = "inline-block";
  } catch (err) {    
    ntf_setStatus(Enums.STT.ERROR, "Error al crear la tabla de resultados: " + err.message);
  }
}

function onc_showSummary() {
  const summaryPanel = document.getElementById("onc_summaryPanel");
  const summaryBody = document.getElementById("summary_table_body");

  summaryBody.innerHTML = "";

  const groups = document.querySelectorAll(".input-group");

  groups.forEach(group => {
    const tokenInput = group.querySelector('input[type="text"]');
    const chainSelect = group.querySelector("select");
    const fromInput = group.querySelector('input[name="onc_fromDate"]') || group.querySelector('input[type="datetime-local"]:nth-of-type(1)');
    const toInput = group.querySelector('input[name="onc_toDate"]') || group.querySelector('input[type="datetime-local"]:nth-of-type(2)');

    const token = tokenInput ? tokenInput.value.trim() : "";
    const chain = chainSelect ? chainSelect.selectedOptions[0].text.trim() : "";
    const from = fromInput ? fromInput.value : "";
    const to = toInput ? toInput.value : "";

    const progressId = `prg_${token || "notoken"}`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${token}</td>
      <td>${chain}</td>
      <td>${from}</td>
      <td>${to}</td>
      <td id="${progressId}" class="status">Consultando...</td>
    `;
    summaryBody.appendChild(row);
  });

  utl_fadeOutPanel(document.querySelector(".input-groups-wrapper"), () => {
    utl_fadeInPanel(summaryPanel);
  });

  document.getElementById("onc_newQuery").style.display = "none";
}

function oncValidateSeconds(dateStr) {
  if (/\d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
  if (/\d{2}:\d{2}$/.test(dateStr)) return dateStr + ":00";
  return dateStr;
}
