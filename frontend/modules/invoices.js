import { badge, escapeHtml, promptNumber, table, toast } from "../js/utils.js";

export function renderInvoices(app) {
  const search = app.filters.invoiceSearch || "";
  const filter = app.filters.invoiceFilter || "all";
  const docs = app.state.documents
    .filter((d) => !search || [d.number, d.createdAt, app.client(d.clientId)?.name].join(" ").toLowerCase().includes(search.toLowerCase()))
    .filter((d) => filter === "all" || d.type === filter || d.status === filter || (filter === "overdue" && app.isOverdue(d)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  app.root.innerHTML = `
    <div class="view-header"><div><h2>Facturas y documentos</h2><p>Cotizaciones, pedidos, facturas, notas de credito/debito, pagos y estados.</p></div></div>
    <div class="panel"><div class="filters"><input id="invoiceSearch" value="${escapeHtml(search)}" placeholder="Buscar numero, cliente o fecha"><select id="invoiceFilter"><option value="all">Todos</option><option value="quote">Cotizaciones</option><option value="order">Pedidos</option><option value="invoice">Facturas</option><option value="creditNote">Notas de credito</option><option value="debitNote">Notas de debito</option><option value="pending">Pendientes</option><option value="paid">Pagadas</option><option value="void">Anuladas</option><option value="overdue">Vencidas</option></select></div>
    ${table(["Documento", "Cliente", "Detalle", "Total", "Estado", "Pagos", "Acciones"], docs.map((d) => row(app, d)), "No hay documentos.")}</div>`;
  document.getElementById("invoiceFilter").value = filter;
  document.getElementById("invoiceSearch").addEventListener("input", (e) => app.setFilter("invoiceSearch", e.target.value));
  document.getElementById("invoiceFilter").addEventListener("change", (e) => app.setFilter("invoiceFilter", e.target.value));
  app.root.querySelectorAll("[data-pay]").forEach((b) => b.addEventListener("click", async () => { const doc = app.state.documents.find((d) => d.id === b.dataset.pay); const value = await promptNumber("Registrar pago parcial", `Saldo pendiente: ${app.money(doc.balance)}`); if (value) { app.addPayment(doc.id, value); app.render(); toast("Pago registrado"); } }));
  app.root.querySelectorAll("[data-print]").forEach((b) => b.addEventListener("click", () => app.printDocument(b.dataset.print)));
  app.root.querySelectorAll("[data-duplicate]").forEach((b) => b.addEventListener("click", () => app.duplicateInvoice(b.dataset.duplicate)));
  app.root.querySelectorAll("[data-void]").forEach((b) => b.addEventListener("click", () => app.voidDocument(b.dataset.void)));
}

function row(app, d) {
  const statusTone = d.status === "paid" ? "success" : d.status === "void" ? "danger" : app.isOverdue(d) ? "danger" : "warning";
  return `<tr><td><strong>${d.number}</strong><br>${d.createdAt}<br>${typeName(d.type)}</td><td>${escapeHtml(app.client(d.clientId)?.name || "Cliente General")}</td><td>${d.items.map((i) => `${escapeHtml(i.name)} x ${i.qty}`).join("<br>")}</td><td>${app.money(d.total)}<br><span class="muted">Saldo ${app.money(d.balance)}</span></td><td>${badge(app.isOverdue(d) ? "vencida" : d.status, statusTone)}<br>${d.dueDate || ""}</td><td>${(d.payments || []).map((p) => `${p.date}: ${app.money(p.amount)}`).join("<br>") || "-"}</td><td class="table-actions">${d.balance > 0 && d.status !== "void" ? `<button data-pay="${d.id}" type="button">Abonar</button>` : ""}<button class="secondary" data-print="${d.id}" type="button">Imprimir</button><button class="secondary" data-duplicate="${d.id}" type="button">Duplicar</button>${d.status !== "void" ? `<button class="danger" data-void="${d.id}" type="button">Anular</button>` : ""}</td></tr>`;
}

function typeName(type) {
  return { invoice: "Factura", quote: "Cotizacion", order: "Pedido", creditNote: "Nota de credito", debitNote: "Nota de debito" }[type] || type;
}
