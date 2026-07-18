import { loadState, saveState, resetState, seedState, nextNumber } from "./storage.js";
import { confirmDialog, dateAdd, download, money, number, toast, today, uid } from "./utils.js";
import { renderDashboard } from "../modules/dashboard.js";
import { renderProducts } from "../modules/products.js";
import { renderClients } from "../modules/clients.js";
import { renderInvoices } from "../modules/invoices.js";
import { renderSales } from "../modules/sales.js";
import { renderReports } from "../modules/reports.js";
import { renderSuppliers } from "../modules/suppliers.js";
import { renderPurchases } from "../modules/purchases.js";
import { renderInventory } from "../modules/inventory.js";
import { renderSettings } from "../modules/settings.js";
import { renderCash } from "../modules/cash.js";

const modules = [
  { id: "dashboard", label: "Dashboard", icon: "▦", render: renderDashboard },
  { id: "sales", label: "Ventas", icon: "$", render: renderSales },
  { id: "products", label: "Productos", icon: "◫", render: renderProducts },
  { id: "inventory", label: "Inventario", icon: "⇄", render: renderInventory },
  { id: "clients", label: "Clientes", icon: "◎", render: renderClients },
  { id: "invoices", label: "Facturas", icon: "▤", render: renderInvoices },
  { id: "payments", label: "Caja", icon: "□", render: renderCash },
  { id: "suppliers", label: "Proveedores", icon: "◇", render: renderSuppliers },
  { id: "purchases", label: "Compras", icon: "＋", render: renderPurchases },
  { id: "reports", label: "Reportes", icon: "∑", render: renderReports },
  { id: "settings", label: "Configuracion", icon: "⚙", render: renderSettings }
];

const app = {
  state: loadState(),
  view: "dashboard",
  filters: {},
  root: document.getElementById("viewRoot"),
  money: (value) => money(value, app.state.settings.currency),
  save() {
    saveState(app.state);
    app.refreshTitle();
  },
  refreshTitle() {
    document.getElementById("companyTitle").textContent = app.state.settings.companyName || "Sistema de Facturacion";
  },
  navigate(view) {
    app.view = view;
    document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    document.getElementById("sidebar").classList.remove("open");
    app.render();
  },
  render() {
    const mod = modules.find((item) => item.id === app.view) || modules[0];
    app.root.innerHTML = "";
    mod.render(app);
  },
  setFilter(name, value) {
    app.filters[name] = value;
    app.render();
  },
  product(id) {
    return app.state.products.find((item) => item.id === id);
  },
  client(id) {
    return app.state.clients.find((item) => item.id === id);
  },
  supplier(id) {
    return app.state.suppliers.find((item) => item.id === id);
  },
  clientBalance(clientId) {
    return app.state.documents
      .filter((doc) => doc.clientId === clientId && !["paid", "void"].includes(doc.status))
      .reduce((sum, doc) => sum + number(doc.balance), 0);
  },
  isOverdue(doc) {
    return !["paid", "void"].includes(doc.status) && doc.dueDate && doc.dueDate < today();
  },
  addInventoryMovement(payload) {
    const product = app.product(payload.productId);
    if (!product) return;
    const previousStock = number(product.stock);
    const qty = number(payload.qty);
    const signedQty = ["out", "sale"].includes(payload.kind) ? -Math.abs(qty) : qty;
    product.stock = Math.max(0, previousStock + signedQty);
    if (payload.cost && signedQty > 0) {
      const oldValue = number(product.avgCost || product.cost) * previousStock;
      const newValue = number(payload.cost) * signedQty;
      const newStock = Math.max(1, previousStock + signedQty);
      product.avgCost = (oldValue + newValue) / newStock;
      product.cost = number(payload.cost);
    }
    product.updatedAt = today();
    app.state.inventoryMovements.push({
      id: uid("mov"),
      date: payload.date || today(),
      productId: payload.productId,
      kind: payload.kind,
      qty: Math.abs(qty),
      cost: number(payload.cost || product.cost),
      previousStock,
      newStock: product.stock,
      reference: payload.reference || "",
      notes: payload.notes || ""
    });
  },
  createDocument(payload) {
    const type = payload.type || "invoice";
    const subtotal = payload.items.reduce((sum, item) => sum + number(item.qty) * number(item.price), 0);
    const lineDiscount = payload.items.reduce((sum, item) => sum + number(item.discount), 0);
    const discount = number(payload.discount) + lineDiscount;
    const taxBase = Math.max(0, subtotal - discount);
    const tax = payload.applyTax ? taxBase * (number(payload.taxRate) / 100) : 0;
    const total = Math.max(0, taxBase + tax);
    const status = payload.status || (type === "invoice" && payload.paymentType === "cash" ? "paid" : "pending");
    const balance = status === "paid" ? 0 : total;
    const doc = {
      id: uid("doc"),
      type,
      number: nextNumber(app.state, type),
      clientId: payload.clientId || "",
      createdAt: today(),
      dueDate: payload.dueDate || "",
      items: payload.items,
      subtotal,
      discount,
      tax,
      taxRate: number(payload.taxRate),
      total,
      balance,
      status,
      notes: payload.notes || "",
      sourceId: payload.sourceId || "",
      payments: []
    };
    app.state.documents.push(doc);
    if (type === "invoice") {
      payload.items.forEach((item) => app.addInventoryMovement({
        productId: item.productId,
        kind: "sale",
        qty: item.qty,
        reference: doc.number,
        notes: "Venta facturada"
      }));
      const client = app.client(doc.clientId);
      if (client) {
        client.lastPurchase = today();
        client.totalPurchased = number(client.totalPurchased) + total;
      }
      if (payload.paymentType === "cash") app.addPayment(doc.id, total, payload.method || "Efectivo", payload.reference || "");
    }
    app.save();
    return doc;
  },
  addPayment(documentId, amount, method = "Efectivo", reference = "") {
    const doc = app.state.documents.find((item) => item.id === documentId);
    if (!doc || doc.status === "void") return null;
    const value = Math.min(number(amount), number(doc.balance || doc.total));
    if (value <= 0) return null;
    const payment = {
      id: uid("pay"),
      documentId,
      clientId: doc.clientId,
      amount: value,
      method,
      reference,
      date: today()
    };
    doc.payments = doc.payments || [];
    doc.payments.push(payment);
    doc.balance = Math.max(0, number(doc.balance) - value);
    doc.status = doc.balance <= 0 ? "paid" : "pending";
    app.state.payments.push(payment);
    app.addCashMovement("income", value, `Pago ${doc.number}`, method, reference);
    app.save();
    return payment;
  },
  addCashMovement(kind, amount, concept, method = "Efectivo", reference = "") {
    const openSession = app.state.cashSessions.find((session) => session.status === "open");
    app.state.cashMovements.push({
      id: uid("cash"),
      sessionId: openSession?.id || "",
      date: today(),
      kind,
      amount: number(amount),
      concept,
      method,
      reference
    });
  },
  duplicateInvoice(id) {
    const doc = app.state.documents.find((item) => item.id === id);
    if (!doc) return;
    app.view = "sales";
    app.filters.duplicate = id;
    app.render();
  },
  async voidDocument(id) {
    const doc = app.state.documents.find((item) => item.id === id);
    if (!doc || doc.status === "void") return;
    if (!(await confirmDialog("Anular documento", "La factura quedara anulada y se devolvera el inventario.", "Anular"))) return;
    if (doc.type === "invoice") {
      doc.items.forEach((item) => app.addInventoryMovement({
        productId: item.productId,
        kind: "in",
        qty: item.qty,
        reference: doc.number,
        notes: "Devolucion por anulacion"
      }));
    }
    doc.status = "void";
    doc.balance = 0;
    app.save();
    app.render();
    toast("Documento anulado");
  },
  printDocument(id) {
    const doc = app.state.documents.find((item) => item.id === id);
    if (!doc) return;
    const client = app.client(doc.clientId);
    const printable = document.createElement("section");
    printable.className = "panel";
    printable.innerHTML = `
      <h2>${app.state.settings.companyName}</h2>
      <p>${app.state.settings.address || ""} ${app.state.settings.phone || ""}</p>
      <h3>${doc.number}</h3>
      <p><strong>Fecha:</strong> ${doc.createdAt}</p>
      <p><strong>Cliente:</strong> ${client ? client.name : "Cliente General"}</p>
      <table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead>
      <tbody>${doc.items.map((item) => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${app.money(item.price)}</td><td>${app.money(item.qty * item.price - number(item.discount))}</td></tr>`).join("")}</tbody></table>
      <h3>Total: ${app.money(doc.total)}</h3>
      <p>${doc.notes || ""}</p>`;
    const original = document.body.innerHTML;
    document.body.innerHTML = printable.outerHTML;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  }
};

function renderNav() {
  document.getElementById("mainNav").innerHTML = modules.map((mod) => `
    <button class="nav-button ${mod.id === app.view ? "active" : ""}" data-view="${mod.id}" type="button">
      <span class="nav-icon">${mod.icon}</span><span>${mod.label}</span>
    </button>`).join("");
  document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => app.navigate(button.dataset.view)));
}

function exportExcel() {
  const wb = XLSX.utils.book_new();
  ["products", "clients", "suppliers", "documents", "payments", "inventoryMovements", "purchases", "cashMovements"].forEach((key) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(app.state[key] || []), key.slice(0, 31));
  });
  XLSX.writeFile(wb, `facturacion-${today()}.xlsx`);
}

function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const invoices = app.state.documents.filter((item) => item.type === "invoice");
  doc.text(app.state.settings.companyName, 14, 16);
  doc.text(`Reporte de facturacion ${today()}`, 14, 25);
  doc.text(`Facturas: ${invoices.length}`, 14, 38);
  doc.text(`Total vendido: ${app.money(invoices.reduce((sum, item) => sum + number(item.total), 0))}`, 14, 47);
  doc.text(`Inventario valorizado: ${app.money(app.state.products.reduce((sum, item) => sum + number(item.stock) * number(item.avgCost || item.cost), 0))}`, 14, 56);
  doc.save(`reporte-facturacion-${today()}.pdf`);
}

document.getElementById("menuToggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("seedDataBtn").addEventListener("click", async () => {
  if ((app.state.products.length || app.state.clients.length) && !(await confirmDialog("Agregar datos demo", "Se agregaran datos de ejemplo sin borrar la informacion actual.", "Agregar"))) return;
  seedState(app.state);
  app.save();
  app.render();
  toast("Datos demo cargados");
});
document.getElementById("exportJsonBtn").addEventListener("click", () => download(`facturacion-backup-${today()}.json`, JSON.stringify(app.state, null, 2)));
document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);
document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!(await confirmDialog("Reiniciar sistema", "Se eliminaran los datos guardados en este navegador.", "Reiniciar"))) return;
  resetState();
  app.state = loadState();
  app.render();
  toast("Sistema reiniciado");
});

renderNav();
app.refreshTitle();
app.render();
