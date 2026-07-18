import { dateAdd, escapeHtml, getFormData, number, table, toast } from "../js/utils.js";

export function renderSales(app) {
  const duplicate = app.state.documents.find((d) => d.id === app.filters.duplicate);
  const taxRate = number(app.state.settings.taxRate);
  app.root.innerHTML = `
    <div class="view-header"><div><h2>Ventas</h2><p>Facturas, cotizaciones, pedidos, descuentos, impuestos y busqueda por codigo de barras.</p></div></div>
    <div class="grid two">
      <form class="panel" id="saleForm">
        <h3 class="panel-title">Nuevo documento</h3>
        <div class="row three"><div><label>Tipo</label><select name="type"><option value="invoice">Factura</option><option value="quote">Cotizacion</option><option value="order">Pedido</option><option value="creditNote">Nota de credito</option><option value="debitNote">Nota de debito</option></select></div><div><label>Cliente</label><select name="clientId"><option value="">Cliente General</option>${app.state.clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}</select></div><div><label>Pago</label><select name="paymentType"><option value="cash">Contado</option><option value="credit">Credito</option></select></div></div>
        <div class="row three"><div><label>Buscar por barra</label><input id="barcodeLookup" placeholder="Escanee o escriba codigo"></div><div><label>Descuento general</label><input name="discount" type="number" min="0" step="0.01" value="0"></div><div><label>Impuesto %</label><input name="taxRate" type="number" min="0" step="0.01" value="${taxRate}"></div></div>
        <label>Productos</label><div class="line-items" id="saleItems"></div>
        <div class="actions"><button class="secondary" id="addLine" type="button">Agregar producto</button></div>
        <div class="total-box" id="saleTotals"></div>
        <div class="row"><div><label>Metodo de pago</label><select name="method"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Cheque</option></select></div><div><label>Referencia</label><input name="reference"></div></div>
        <label>Observaciones</label><textarea name="notes"></textarea>
        <div class="actions"><button type="submit">Guardar documento</button><button class="secondary" type="button" id="clearSale">Limpiar</button></div>
      </form>
      <div class="panel"><h3 class="panel-title">Ultimas ventas</h3>${recent(app)}</div>
    </div>`;
  const form = document.getElementById("saleForm");
  if (duplicate) {
    form.elements.clientId.value = duplicate.clientId;
    form.elements.type.value = "invoice";
    duplicate.items.forEach((item) => addLine(app, item));
    app.filters.duplicate = "";
  } else addLine(app);
  const refresh = () => updateTotals(app);
  document.getElementById("addLine").addEventListener("click", () => { addLine(app); refresh(); });
  document.getElementById("barcodeLookup").addEventListener("change", (e) => {
    const product = app.state.products.find((p) => p.barcode === e.target.value || p.sku === e.target.value);
    if (product) addLine(app, { productId: product.id, qty: 1, price: product.price, discount: 0 });
    e.target.value = ""; refresh();
  });
  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  document.getElementById("clearSale").addEventListener("click", () => app.render());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getFormData(form);
    const items = getItems(app);
    if (!items.length) return toast("Agregue al menos un producto", "warning");
    const client = app.client(data.clientId);
    if (data.paymentType === "credit" && !client) return toast("Seleccione un cliente para ventas a credito", "warning");
    const total = totals(items, data.discount, data.taxRate).total;
    if (data.paymentType === "credit" && client && total > (number(client.creditLimit) - app.clientBalance(client.id))) return toast("El total supera el credito disponible", "warning");
    if (data.type === "invoice" && items.some((i) => i.qty > number(app.product(i.productId)?.stock))) return toast("Hay productos con stock insuficiente", "warning");
    const doc = app.createDocument({ type: data.type, clientId: data.clientId, items, discount: data.discount, applyTax: true, taxRate: data.taxRate, paymentType: data.paymentType, method: data.method, reference: data.reference, dueDate: data.paymentType === "credit" ? dateAdd(new Date().toISOString().slice(0, 10), client?.creditDays || 0) : "", notes: data.notes });
    app.render(); toast(`Documento creado: ${doc.number}`);
  });
  refresh();
}

function addLine(app, source = {}) {
  const wrap = document.createElement("div");
  wrap.className = "line-item";
  wrap.innerHTML = `<div><label>Producto</label><select class="line-product"><option value="">Seleccione</option>${app.state.products.filter((p) => p.status !== "inactive").map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${p.stock})</option>`).join("")}</select></div><div><label>Cant.</label><input class="line-qty" type="number" min="1" step="1" value="${source.qty || 1}"></div><div><label>Precio</label><input class="line-price" type="number" min="0" step="0.01" value="${source.price || 0}"></div><div><label>Desc.</label><input class="line-discount" type="number" min="0" step="0.01" value="${source.discount || 0}"></div><div><label>Stock</label><input class="line-stock" disabled></div><button class="danger remove-line" type="button">X</button>`;
  document.getElementById("saleItems").appendChild(wrap);
  wrap.querySelector(".line-product").value = source.productId || "";
  const sync = () => { const p = app.product(wrap.querySelector(".line-product").value); if (p) { if (!number(wrap.querySelector(".line-price").value)) wrap.querySelector(".line-price").value = p.price; wrap.querySelector(".line-stock").value = p.stock; } updateTotals(app); };
  wrap.querySelector(".line-product").addEventListener("change", sync);
  wrap.querySelector(".remove-line").addEventListener("click", () => { wrap.remove(); updateTotals(app); });
  sync();
}

function getItems(app) {
  return Array.from(document.querySelectorAll(".line-item")).map((row) => {
    const product = app.product(row.querySelector(".line-product").value);
    if (!product) return null;
    const qty = number(row.querySelector(".line-qty").value);
    const price = number(row.querySelector(".line-price").value);
    const discount = number(row.querySelector(".line-discount").value);
    return { productId: product.id, name: product.name, qty, price, discount, taxRate: number(document.querySelector("[name='taxRate']").value), subtotal: qty * price - discount };
  }).filter(Boolean);
}

function totals(items, discount, taxRate) {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const lineDiscount = items.reduce((sum, i) => sum + number(i.discount), 0);
  const taxBase = Math.max(0, subtotal - lineDiscount - number(discount));
  const tax = taxBase * (number(taxRate) / 100);
  return { subtotal, discount: lineDiscount + number(discount), tax, total: taxBase + tax };
}

function updateTotals(app) {
  const form = document.getElementById("saleForm");
  const t = totals(getItems(app), form.elements.discount.value, form.elements.taxRate.value);
  document.getElementById("saleTotals").innerHTML = `<div class="total-line"><span>Subtotal</span><strong>${app.money(t.subtotal)}</strong></div><div class="total-line"><span>Descuento</span><strong>${app.money(t.discount)}</strong></div><div class="total-line"><span>Impuestos</span><strong>${app.money(t.tax)}</strong></div><div class="total-line"><span>Total</span><strong>${app.money(t.total)}</strong></div>`;
}

function recent(app) {
  const rows = app.state.documents.filter((d) => d.type === "invoice").slice(-8).reverse().map((d) => `<tr><td><strong>${d.number}</strong><br>${d.createdAt}</td><td>${escapeHtml(app.client(d.clientId)?.name || "Cliente General")}</td><td>${app.money(d.total)}</td><td>${d.status}</td></tr>`);
  return table(["Numero", "Cliente", "Total", "Estado"], rows, "Sin ventas registradas.");
}
