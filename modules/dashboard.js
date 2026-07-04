import { badge, table, today, number } from "../js/utils.js";

export function renderDashboard(app) {
  const invoices = app.state.documents.filter((doc) => doc.type === "invoice" && doc.status !== "void");
  const salesToday = invoices.filter((doc) => doc.createdAt === today()).reduce((sum, doc) => sum + number(doc.total), 0);
  const currentMonth = today().slice(0, 7);
  const salesMonth = invoices.filter((doc) => doc.createdAt.slice(0, 7) === currentMonth).reduce((sum, doc) => sum + number(doc.total), 0);
  const receivable = invoices.reduce((sum, doc) => sum + number(doc.balance), 0);
  const low = app.state.products.filter((p) => number(p.stock) > 0 && number(p.stock) <= number(p.minStock));
  const out = app.state.products.filter((p) => number(p.stock) <= 0);
  const pending = invoices.filter((doc) => doc.status === "pending").length;
  const overdue = invoices.filter((doc) => app.isOverdue(doc)).length;

  app.root.innerHTML = `
    <div class="view-header">
      <div><h2>Dashboard</h2><p>Indicadores operativos de facturacion e inventario.</p></div>
    </div>
    <div class="grid four">
      ${metric("Ventas del dia", app.money(salesToday), "$", "Facturacion registrada hoy")}
      ${metric("Ventas del mes", app.money(salesMonth), "$", "Mes actual")}
      ${metric("Clientes activos", app.state.clients.filter((c) => c.status !== "inactive").length, "◎", "Clientes disponibles")}
      ${metric("Productos", app.state.products.length, "◫", "Catalogo total")}
      ${metric("Agotados", out.length, "!", "Stock en cero")}
      ${metric("Bajo minimo", low.length, "↓", "Requieren reposicion")}
      ${metric("Pendientes", pending, "▤", "Facturas por cobrar")}
      ${metric("Monto por cobrar", app.money(receivable), "$", `${overdue} vencidas`)}
    </div>
    <div class="grid two mt">
      <div class="panel">
        <h3 class="panel-title">Grafico mensual</h3>
        ${monthlyChart(app, invoices)}
      </div>
      <div class="panel">
        <h3 class="panel-title">Alertas de inventario</h3>
        ${table(["Producto", "Stock", "Minimo", "Estado"], [...out, ...low].slice(0, 8).map((p) => `
          <tr><td>${p.name}</td><td>${p.stock}</td><td>${p.minStock}</td><td>${p.stock <= 0 ? badge("Agotado", "danger") : badge("Bajo minimo", "warning")}</td></tr>`), "No hay alertas de inventario.")}
      </div>
    </div>`;
}

function metric(label, value, icon, hint) {
  return `<article class="metric"><div class="metric-top"><span>${label}</span><span>${icon}</span></div><strong>${value}</strong><small>${hint}</small></article>`;
}

function monthlyChart(app, invoices) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date.toISOString().slice(0, 7);
  });
  const values = months.map((month) => invoices.filter((doc) => doc.createdAt.slice(0, 7) === month).reduce((sum, doc) => sum + number(doc.total), 0));
  const max = Math.max(1, ...values);
  return `<div class="chart">${months.map((month, index) => `
    <div class="bar-row"><span>${month}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round((values[index] / max) * 100)}%"></div></div><strong>${app.money(values[index])}</strong></div>`).join("")}</div>`;
}
