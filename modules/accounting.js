import { table, escapeHtml, badge } from "../js/utils.js";

export const accountingViews = {
  accountingDashboard: ["Resumen contable", "Indicadores contables iniciales desde operaciones y backend.", ["Indicador", "Valor", "Estado"]],
  chartOfAccounts: ["Catalogo de cuentas", "Catalogo jerarquico de cuentas contables.", ["Codigo", "Nombre", "Estado"]],
  journal: ["Asientos", "Asientos manuales, automaticos, ajustes, apertura, cierre y reversion.", ["Fecha", "Asiento", "Cuenta", "Debe", "Haber"]],
  ledger: ["Libro mayor", "Movimientos por cuenta con saldo acumulado.", ["Fecha", "Asiento", "Debe", "Haber", "Saldo"]],
  trialBalance: ["Balanza", "Balanza de comprobacion y validacion Debe = Haber.", ["Cuenta", "Debe", "Haber", "Saldo deudor", "Saldo acreedor"]],
  ar: ["Cuentas por cobrar", "Facturas pendientes, pagos parciales y antiguedad.", ["Cliente", "Saldo", "Credito"]],
  ap: ["Cuentas por pagar", "Facturas de proveedor, pagos parciales y vencimientos.", ["Proveedor", "Saldo", "Estado"]],
  banks: ["Caja y bancos", "Cajas, metodos de pago, bancos y transacciones.", ["Cuenta", "Tipo", "Saldo"]],
  reconciliation: ["Conciliacion bancaria", "Comparacion de banco contra sistema.", ["Banco", "Fecha", "Diferencia"]],
  costCenters: ["Centros de costos", "Centros jerarquicos para gastos, compras y asientos.", ["Codigo", "Nombre", "Estado"]],
  periods: ["Periodos", "Apertura, cierre provisional, cierre y reapertura controlada.", ["Periodo", "Estado", "Cierre"]],
  financialStatements: ["Estados financieros", "Balance, resultados, flujo de efectivo y patrimonio desde asientos.", ["Estado", "Periodo", "Validacion"]],
  accountingSettings: ["Configuracion contable", "Cuentas predeterminadas y reglas del motor contable.", ["Evento", "Regla", "Estado"]]
};

export function renderAccountingSection(app, id) {
  const [title, description, headers] = accountingViews[id];
  const rows = rowsFor(app, id);
  app.root.innerHTML = `
    <div class="view-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></div>
    <div class="grid four">
      <article class="metric"><div class="metric-top"><span>Fuente principal</span><span>API</span></div><strong>PostgreSQL</strong><small>Via backend Express/Prisma</small></article>
      <article class="metric"><div class="metric-top"><span>Permisos</span><span>ACL</span></div><strong>Backend</strong><small>Modulo y accion</small></article>
      <article class="metric"><div class="metric-top"><span>Auditoria</span><span>LOG</span></div><strong>Inmutable</strong><small>Sin borrado normal</small></article>
      <article class="metric"><div class="metric-top"><span>Moneda</span><span>DOP</span></div><strong>${escapeHtml(app.state.settings.currency || "DOP")}</strong><small>Configurable</small></article>
    </div>
    <div class="panel mt">
      <h3 class="panel-title">${escapeHtml(title)}</h3>
      ${table(headers, rows, "Sin datos contables para mostrar. Ejecute backend, migraciones y seed.")}
    </div>`;
}

function rowsFor(app, id) {
  if (id === "accountingDashboard") {
    const invoices = app.state.documents.filter((doc) => doc.type === "invoice" && doc.status !== "void");
    return [
      `<tr><td>Ingresos operativos</td><td>${app.money(invoices.reduce((sum, doc) => sum + Number(doc.total || 0), 0))}</td><td>${badge("Temporal frontend", "warning")}</td></tr>`,
      `<tr><td>Cuentas por cobrar</td><td>${app.money(invoices.reduce((sum, doc) => sum + Number(doc.balance || 0), 0))}</td><td>${badge("Migrable", "success")}</td></tr>`,
      `<tr><td>Asientos pendientes</td><td>0</td><td>${badge("Backend", "dark")}</td></tr>`
    ];
  }
  if (id === "chartOfAccounts") {
    return ["1 ACTIVO", "2 PASIVO", "3 PATRIMONIO", "4 INGRESOS", "5 COSTOS", "6 GASTOS"]
      .map((row) => `<tr><td>${escapeHtml(row.split(" ")[0])}</td><td>${escapeHtml(row.substring(2))}</td><td>${badge("Seed", "success")}</td></tr>`);
  }
  if (id === "ar") {
    return app.state.clients.map((client) => `<tr><td>${escapeHtml(client.name)}</td><td>${app.money(app.clientBalance(client.id))}</td><td>${client.creditDays || 0} dias</td></tr>`);
  }
  if (id === "ap") {
    return app.state.suppliers.map((supplier) => `<tr><td>${escapeHtml(supplier.name)}</td><td>${app.money(0)}</td><td>${badge("Pendiente backend", "warning")}</td></tr>`);
  }
  return [];
}
