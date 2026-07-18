import { confirmDialog, getFormData, number, table, today, toast, uid } from "../js/utils.js";

export function renderCash(app) {
  const open = app.state.cashSessions.find((s) => s.status === "open");
  const movements = app.state.cashMovements.filter((m) => !open || m.sessionId === open.id || !m.sessionId);
  const balance = movements.reduce((sum, m) => sum + (m.kind === "expense" ? -number(m.amount) : number(m.amount)), number(open?.openingAmount));
  app.root.innerHTML = `
    <div class="view-header"><div><h2>Caja</h2><p>Apertura, cierre, arqueo, ingresos, egresos y saldo actual.</p></div><div>${open ? `<button class="danger" id="closeCash" type="button">Cerrar caja</button>` : ""}</div></div>
    <div class="grid four">${metric("Estado", open ? "Abierta" : "Cerrada"), metric("Saldo actual", app.money(balance)), metric("Ingresos", app.money(movements.filter((m) => m.kind === "income").reduce((s, m) => s + number(m.amount), 0))), metric("Egresos", app.money(movements.filter((m) => m.kind === "expense").reduce((s, m) => s + number(m.amount), 0)))}</div>
    <div class="grid two mt">
      <form class="panel" id="cashForm"><h3 class="panel-title">${open ? "Movimiento de caja" : "Apertura de caja"}</h3>
        ${open ? `<div class="row"><div><label>Tipo</label><select name="kind"><option value="income">Ingreso</option><option value="expense">Egreso</option></select></div><div><label>Monto</label><input name="amount" type="number" min="0" step="0.01" required></div></div><label>Concepto</label><input name="concept" required><div class="row"><div><label>Metodo</label><select name="method"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Cheque</option></select></div><div><label>Referencia</label><input name="reference"></div></div>` : `<label>Monto inicial</label><input name="openingAmount" type="number" min="0" step="0.01" value="0">`}
        <div class="actions"><button type="submit">${open ? "Registrar movimiento" : "Abrir caja"}</button></div></form>
      <div class="panel"><h3 class="panel-title">Movimientos</h3>${table(["Fecha", "Tipo", "Concepto", "Metodo", "Monto"], movements.slice().reverse().map((m) => `<tr><td>${m.date}</td><td>${m.kind}</td><td>${m.concept}</td><td>${m.method}</td><td>${app.money(m.amount)}</td></tr>`), "Sin movimientos.")}</div>
    </div>`;
  document.getElementById("cashForm").addEventListener("submit", (event) => {
    event.preventDefault(); const d = getFormData(event.currentTarget);
    if (!open) app.state.cashSessions.push({ id: uid("session"), date: today(), openingAmount: number(d.openingAmount), closingAmount: 0, status: "open" });
    else app.addCashMovement(d.kind, d.amount, d.concept, d.method, d.reference);
    app.save(); app.render(); toast(open ? "Movimiento registrado" : "Caja abierta");
  });
  if (open) document.getElementById("closeCash").addEventListener("click", async () => { if (!(await confirmDialog("Cerrar caja", `Saldo calculado: ${app.money(balance)}`, "Cerrar"))) return; open.status = "closed"; open.closedAt = today(); open.closingAmount = balance; app.save(); app.render(); toast("Caja cerrada"); });
}

function metric(label, value) { return `<article class="metric"><div class="metric-top"><span>${label}</span><span>□</span></div><strong>${value}</strong></article>`; }
