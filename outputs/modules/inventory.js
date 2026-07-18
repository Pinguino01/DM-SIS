import { badge, escapeHtml, getFormData, number, table, today, toast } from "../js/utils.js";

export function renderInventory(app) {
  const productId = app.filters.kardexProduct || "";
  const movements = app.state.inventoryMovements.filter((m) => !productId || m.productId === productId).sort((a, b) => b.date.localeCompare(a.date));
  const totalValue = app.state.products.reduce((sum, p) => sum + number(p.stock) * number(p.avgCost || p.cost), 0);
  const low = app.state.products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  const out = app.state.products.filter((p) => p.stock <= 0);
  app.root.innerHTML = `
    <div class="view-header"><div><h2>Inventario</h2><p>Entradas, salidas, ajustes, transferencias, historial y Kardex.</p></div></div>
    <div class="grid four">${metric("Valor total", app.money(totalValue)), metric("Agotados", out.length), metric("Bajo minimo", low.length), metric("Movimientos", app.state.inventoryMovements.length)}</div>
    <div class="grid two mt">
      <form class="panel" id="movementForm"><h3 class="panel-title">Movimiento</h3>
        <label>Producto</label><select name="productId" required>${app.state.products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${p.stock})</option>`).join("")}</select>
        <div class="row"><div><label>Tipo</label><select name="kind"><option value="in">Entrada</option><option value="out">Salida</option><option value="adjust">Ajuste</option><option value="transfer">Transferencia</option></select></div><div><label>Cantidad</label><input name="qty" type="number" min="1" step="1" required></div></div>
        <div class="row"><div><label>Costo</label><input name="cost" type="number" min="0" step="0.01"></div><div><label>Referencia</label><input name="reference"></div></div>
        <label>Notas / destino de transferencia</label><textarea name="notes"></textarea>
        <div class="actions"><button type="submit">Registrar movimiento</button></div></form>
      <div class="panel"><h3 class="panel-title">Productos criticos</h3>
        ${table(["Producto", "Stock", "Minimo", "Estado"], [...out, ...low].map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${p.stock}</td><td>${p.minStock}</td><td>${p.stock <= 0 ? badge("Agotado", "danger") : badge("Bajo minimo", "warning")}</td></tr>`), "Sin productos criticos.")}
      </div>
    </div>
    <div class="panel mt"><h3 class="panel-title">Kardex e historial</h3><div class="filters"><select id="kardexProduct"><option value="">Todos los productos</option>${app.state.products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}</select><span></span></div>
      ${table(["Fecha", "Producto", "Tipo", "Cantidad", "Stock anterior", "Stock nuevo", "Costo", "Referencia"], movements.map((m) => `<tr><td>${m.date}</td><td>${escapeHtml(app.product(m.productId)?.name || "-")}</td><td>${badge(m.kind)}</td><td>${m.qty}</td><td>${m.previousStock}</td><td>${m.newStock}</td><td>${app.money(m.cost)}</td><td>${escapeHtml(m.reference || m.notes || "")}</td></tr>`), "Sin movimientos.")}</div>`;
  document.getElementById("kardexProduct").value = productId;
  document.getElementById("kardexProduct").addEventListener("change", (e) => app.setFilter("kardexProduct", e.target.value));
  document.getElementById("movementForm").addEventListener("submit", (event) => { event.preventDefault(); const d = getFormData(event.currentTarget); app.addInventoryMovement({ productId: d.productId, kind: d.kind, qty: d.qty, cost: d.cost, reference: d.reference, notes: d.notes, date: today() }); app.save(); app.render(); toast("Movimiento registrado"); });
}

function metric(label, value) { return `<article class="metric"><div class="metric-top"><span>${label}</span><span>⇄</span></div><strong>${value}</strong></article>`; }
