import { escapeHtml, number, table, today } from "../js/utils.js";

export function renderReports(app) {
  const invoices = app.state.documents.filter((d) => d.type === "invoice" && d.status !== "void");
  const byDay = group(invoices, (d) => d.createdAt);
  const byMonth = group(invoices, (d) => d.createdAt.slice(0, 7));
  const byClient = group(invoices, (d) => app.client(d.clientId)?.name || "Cliente General");
  const productStats = {};
  invoices.flatMap((d) => d.items).forEach((i) => {
    productStats[i.productId] ||= { name: i.name, qty: 0, total: 0 };
    productStats[i.productId].qty += number(i.qty);
    productStats[i.productId].total += number(i.subtotal || i.qty * i.price);
  });
  const products = Object.values(productStats).sort((a, b) => b.qty - a.qty);
  const debtClients = app.state.clients.map((c) => ({ ...c, balance: app.clientBalance(c.id), overdue: app.state.documents.some((d) => d.clientId === c.id && app.isOverdue(d)) })).filter((c) => c.balance > 0);
  const estimatedProfit = invoices.reduce((sum, d) => sum + d.items.reduce((inner, i) => inner + (number(i.price) - number(app.product(i.productId)?.avgCost || app.product(i.productId)?.cost)) * number(i.qty), 0), 0);

  app.root.innerHTML = `
    <div class="view-header"><div><h2>Reportes</h2><p>Analisis operativo sin modulos contables.</p></div></div>
    <div class="grid four">${metric("Ganancia estimada", app.money(estimatedProfit)), metric("Ventas", app.money(invoices.reduce((s, d) => s + number(d.total), 0))), metric("Clientes con deuda", debtClients.length), metric("Inventario", app.money(app.state.products.reduce((s, p) => s + number(p.stock) * number(p.avgCost || p.cost), 0)))}</div>
    <div class="grid two mt">
      <div class="panel"><h3 class="panel-title">Ventas por dia</h3>${chart(app, byDay)}</div>
      <div class="panel"><h3 class="panel-title">Ventas por mes</h3>${chart(app, byMonth)}</div>
      <div class="panel"><h3 class="panel-title">Ventas por cliente</h3>${chart(app, byClient)}</div>
      <div class="panel"><h3 class="panel-title">Ventas por producto</h3>${table(["Producto", "Cantidad", "Total"], products.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${p.qty}</td><td>${app.money(p.total)}</td></tr>`), "Sin ventas por producto.")}</div>
      <div class="panel"><h3 class="panel-title">Productos mas vendidos</h3>${table(["Producto", "Cantidad"], products.slice(0, 10).map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${p.qty}</td></tr>`), "Sin datos.")}</div>
      <div class="panel"><h3 class="panel-title">Productos menos vendidos</h3>${table(["Producto", "Cantidad"], products.slice().reverse().slice(0, 10).map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${p.qty}</td></tr>`), "Sin datos.")}</div>
      <div class="panel"><h3 class="panel-title">Clientes con deuda / morosos</h3>${table(["Cliente", "Saldo", "Estado"], debtClients.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${app.money(c.balance)}</td><td>${c.overdue ? "Moroso" : "Pendiente"}</td></tr>`), "No hay cuentas por cobrar.")}</div>
      <div class="panel"><h3 class="panel-title">Productos agotados</h3>${table(["Producto", "Categoria", "Stock"], app.state.products.filter((p) => p.stock <= 0).map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.category || "-")}</td><td>${p.stock}</td></tr>`), "Sin agotados.")}</div>
    </div>`;
}

function group(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + number(item.total);
    return acc;
  }, {});
}

function chart(app, values) {
  const entries = Object.entries(values).sort().slice(-12);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  if (!entries.length) return `<div class="empty">Sin datos para graficar.</div>`;
  return `<div class="chart">${entries.map(([label, value]) => `<div class="bar-row"><span>${escapeHtml(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round((value / max) * 100)}%"></div></div><strong>${app.money(value)}</strong></div>`).join("")}</div>`;
}

function metric(label, value) { return `<article class="metric"><div class="metric-top"><span>${label}</span><span>∑</span></div><strong>${value}</strong><small>Actualizado ${today()}</small></article>`; }
