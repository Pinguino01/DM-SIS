import { badge, confirmDialog, escapeHtml, getFormData, number, table, today, toast, uid } from "../js/utils.js";

export function renderClients(app) {
  const search = app.filters.clientSearch || "";
  const filter = app.filters.clientFilter || "all";
  const clients = app.state.clients
    .map((c) => ({ ...c, balance: app.clientBalance(c.id), overdue: app.state.documents.some((d) => d.clientId === c.id && app.isOverdue(d)) }))
    .filter((c) => !search || [c.name, c.doc, c.phone, c.email].join(" ").toLowerCase().includes(search.toLowerCase()))
    .filter((c) => filter === "all" || (filter === "debt" && c.balance > 0) || (filter === "overdue" && c.overdue) || c.status === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  app.root.innerHTML = `
    <div class="view-header"><div><h2>Clientes</h2><p>Historial, credito, saldo y comportamiento de compra.</p></div></div>
    <div class="grid two">
      <form class="panel" id="clientForm">
        <h3 class="panel-title">Cliente</h3><input name="id" type="hidden">
        <label>Nombre o razon social</label><input name="name" required>
        <div class="row"><div><label>Documento/RNC</label><input name="doc"></div><div><label>Telefono</label><input name="phone"></div></div>
        <label>Correo</label><input name="email" type="email">
        <label>Direccion</label><textarea name="address"></textarea>
        <div class="row three"><div><label>Limite de credito</label><input name="creditLimit" type="number" min="0" step="0.01" value="0"></div><div><label>Dias de credito</label><input name="creditDays" type="number" min="0" step="1" value="0"></div><div><label>Estado</label><select name="status"><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="blocked">Bloqueado</option></select></div></div>
        <label>Observaciones</label><textarea name="notes"></textarea>
        <div class="actions"><button type="submit">Guardar</button><button class="secondary" type="button" id="clearClient">Limpiar</button></div>
      </form>
      <div class="panel">
        <h3 class="panel-title">Listado</h3>
        <div class="filters"><input id="clientSearch" value="${escapeHtml(search)}" placeholder="Buscar cliente"><select id="clientFilter"><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="blocked">Bloqueados</option><option value="debt">Con deuda</option><option value="overdue">Morosos</option></select></div>
        ${table(["Cliente", "Contacto", "Credito", "Saldo", "Historial", "Acciones"], clients.map((c) => `
          <tr><td><strong>${escapeHtml(c.name)}</strong><br>${escapeHtml(c.doc || "Sin documento")}<br>${badge(c.status, c.status === "active" ? "success" : "warning")}</td>
          <td>${escapeHtml(c.phone || "-")}<br>${escapeHtml(c.email || "")}</td>
          <td>${app.money(c.creditLimit)}<br><span class="muted">${c.creditDays} dias</span></td>
          <td>${app.money(c.balance)} ${c.overdue ? badge("Moroso", "danger") : ""}</td>
          <td>Ultima: ${c.lastPurchase || "-"}<br>Total: ${app.money(c.totalPurchased)}</td>
          <td class="table-actions"><button class="secondary" data-edit-client="${c.id}" type="button">Editar</button><button class="ghost" data-history-client="${c.id}" type="button">Historial</button><button class="danger" data-delete-client="${c.id}" type="button">Eliminar</button></td></tr>`), "No hay clientes para mostrar.")}
      </div>
    </div>`;
  document.getElementById("clientFilter").value = filter;
  document.getElementById("clientSearch").addEventListener("input", (e) => app.setFilter("clientSearch", e.target.value));
  document.getElementById("clientFilter").addEventListener("change", (e) => app.setFilter("clientFilter", e.target.value));
  document.getElementById("clearClient").addEventListener("click", () => document.getElementById("clientForm").reset());
  document.getElementById("clientForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getFormData(event.currentTarget);
    const existing = app.client(data.id);
    const payload = { id: data.id || uid("cli"), name: data.name.trim(), doc: data.doc.trim(), phone: data.phone.trim(), email: data.email.trim(), address: data.address.trim(), creditLimit: number(data.creditLimit), creditDays: number(data.creditDays), status: data.status, notes: data.notes.trim(), lastPurchase: existing?.lastPurchase || "", totalPurchased: number(existing?.totalPurchased), createdAt: existing?.createdAt || today(), updatedAt: today() };
    app.state.clients = app.state.clients.filter((c) => c.id !== payload.id).concat(payload);
    app.save(); app.render(); toast("Cliente guardado");
  });
  app.root.querySelectorAll("[data-edit-client]").forEach((b) => b.addEventListener("click", () => fill(app, b.dataset.editClient)));
  app.root.querySelectorAll("[data-history-client]").forEach((b) => b.addEventListener("click", () => showHistory(app, b.dataset.historyClient)));
  app.root.querySelectorAll("[data-delete-client]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.deleteClient;
    if (app.state.documents.some((d) => d.clientId === id)) return toast("No se puede eliminar un cliente con documentos", "warning");
    if (!(await confirmDialog("Eliminar cliente", "Se eliminara del listado.", "Eliminar"))) return;
    app.state.clients = app.state.clients.filter((c) => c.id !== id); app.save(); app.render();
  }));
}

function fill(app, id) {
  const c = app.client(id); const form = document.getElementById("clientForm");
  Object.entries(c).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v ?? ""; });
  form.scrollIntoView({ behavior: "smooth" });
}

function showHistory(app, id) {
  const c = app.client(id);
  const docs = app.state.documents.filter((d) => d.clientId === id);
  Swal.fire({ title: `Historial: ${c.name}`, html: `<div class="stack">${docs.map((d) => `<div class="mini-card"><strong>${d.number}</strong> ${d.createdAt}<br>Total ${app.money(d.total)} · Saldo ${app.money(d.balance)}</div>`).join("") || "Sin historial"}</div>`, width: 720 });
}
