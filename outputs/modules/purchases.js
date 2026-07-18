import { escapeHtml, getFormData, number, table, today, toast, uid } from "../js/utils.js";

export function renderPurchases(app) {
  app.root.innerHTML = `
    <div class="view-header"><div><h2>Compras</h2><p>Ordenes, recepciones y compras directas con actualizacion automatica del inventario.</p></div></div>
    <div class="grid two">
      <form class="panel" id="purchaseForm"><h3 class="panel-title">Nueva compra</h3>
        <div class="row"><div><label>Tipo</label><select name="type"><option value="direct">Compra directa</option><option value="order">Orden de compra</option><option value="receipt">Recepcion</option></select></div><div><label>Proveedor</label><select name="supplierId">${app.state.suppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}</select></div></div>
        <label>Producto</label><select name="productId">${app.state.products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}</select>
        <div class="row three"><div><label>Cantidad</label><input name="qty" type="number" min="1" step="1" required></div><div><label>Costo</label><input name="cost" type="number" min="0" step="0.01" required></div><div><label>Referencia</label><input name="reference"></div></div>
        <label>Notas</label><textarea name="notes"></textarea><div class="actions"><button type="submit">Registrar</button></div></form>
      <div class="panel"><h3 class="panel-title">Historial de compras</h3>${table(["Fecha", "Tipo", "Proveedor", "Producto", "Cantidad", "Costo", "Estado"], app.state.purchases.slice().reverse().map((p) => `<tr><td>${p.date}</td><td>${p.type}</td><td>${escapeHtml(app.supplier(p.supplierId)?.name || "-")}</td><td>${escapeHtml(app.product(p.productId)?.name || "-")}</td><td>${p.qty}</td><td>${app.money(p.cost)}</td><td>${p.status}</td></tr>`), "Sin compras.")}</div>
    </div>`;
  document.getElementById("purchaseForm").addEventListener("submit", (event) => {
    event.preventDefault(); const d = getFormData(event.currentTarget);
    const purchase = { id: uid("pur"), date: today(), type: d.type, supplierId: d.supplierId, productId: d.productId, qty: number(d.qty), cost: number(d.cost), reference: d.reference, notes: d.notes, status: d.type === "order" ? "Pendiente" : "Recibida" };
    app.state.purchases.push(purchase);
    if (purchase.type !== "order") app.addInventoryMovement({ productId: purchase.productId, kind: "in", qty: purchase.qty, cost: purchase.cost, reference: purchase.reference || "Compra", notes: purchase.notes });
    app.save(); app.render(); toast("Compra registrada");
  });
}
