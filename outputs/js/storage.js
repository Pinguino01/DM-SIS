import { today, uid, dateAdd, number } from "./utils.js";

export const STORAGE_KEY = "facturacion-profesional-v2";
const LEGACY_KEY = "facturacion-simple-v1";

export function emptyState() {
  return {
    version: 2,
    settings: {
      companyName: "Sistema de Facturacion",
      logo: "",
      address: "",
      phone: "",
      email: "",
      currency: "BOB",
      taxRate: 18,
      invoiceFormat: "Carta",
      invoicePrefix: "F",
      quotePrefix: "COT",
      orderPrefix: "PED",
      creditNotePrefix: "NC",
      debitNotePrefix: "ND",
      nextInvoice: 1,
      nextQuote: 1,
      nextOrder: 1,
      nextCreditNote: 1,
      nextDebitNote: 1,
      integrationToken: uid("api"),
      syncEndpoint: ""
    },
    products: [],
    clients: [],
    suppliers: [],
    documents: [],
    payments: [],
    inventoryMovements: [],
    purchases: [],
    cashSessions: [],
    cashMovements: []
  };
}

export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return normalize(JSON.parse(saved));

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    const migrated = migrateLegacy(JSON.parse(legacy));
    saveState(migrated);
    return migrated;
  }
  return emptyState();
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

function normalize(state) {
  const base = emptyState();
  return {
    ...base,
    ...state,
    settings: { ...base.settings, ...(state.settings || {}) },
    products: state.products || [],
    clients: state.clients || [],
    suppliers: state.suppliers || [],
    documents: state.documents || state.invoices || [],
    payments: state.payments || [],
    inventoryMovements: state.inventoryMovements || [],
    purchases: state.purchases || [],
    cashSessions: state.cashSessions || [],
    cashMovements: state.cashMovements || []
  };
}

function migrateLegacy(oldState) {
  const state = emptyState();
  state.settings.nextInvoice = oldState.invoiceSeq || 1;
  state.products = (oldState.products || []).map((p) => ({
    id: p.id || uid("prod"),
    barcode: p.barcode || p.sku || "",
    sku: p.sku || "",
    name: p.name || "",
    category: p.category || "",
    brand: p.brand || "",
    unit: p.unit || "Unidad",
    cost: number(p.cost),
    price: number(p.price),
    wholesalePrice: number(p.wholesalePrice || p.price),
    retailPrice: number(p.retailPrice || p.price),
    stock: number(p.stock),
    minStock: number(p.minStock || 0),
    status: p.status || "active",
    image: p.image || "",
    description: p.description || "",
    supplierId: p.supplierId || "",
    avgCost: number(p.cost),
    createdAt: p.createdAt || today(),
    updatedAt: p.updatedAt || today()
  }));
  state.clients = (oldState.clients || []).map((c) => ({
    id: c.id || uid("cli"),
    name: c.name || "",
    doc: c.doc || "",
    phone: c.phone || "",
    email: c.email || "",
    address: c.address || "",
    creditLimit: number(c.creditLimit),
    creditDays: number(c.timeLimit),
    status: c.status || "active",
    notes: c.notes || "",
    lastPurchase: "",
    totalPurchased: 0,
    createdAt: c.createdAt || today(),
    updatedAt: c.updatedAt || today()
  }));
  state.documents = (oldState.invoices || []).map((inv) => ({
    id: inv.id || uid("doc"),
    type: "invoice",
    number: inv.number || nextNumber(state, "invoice"),
    clientId: inv.clientId || "",
    createdAt: inv.createdAt || today(),
    dueDate: inv.dueDate || "",
    items: (inv.items || []).map((item) => ({ ...item, discount: 0, taxRate: state.settings.taxRate })),
    subtotal: number(inv.total),
    discount: 0,
    tax: 0,
    total: number(inv.total),
    balance: number(inv.balance),
    status: inv.status === "paid" ? "paid" : "pending",
    notes: inv.notes || "",
    payments: inv.payments || []
  }));
  state.payments = state.documents.flatMap((doc) =>
    (doc.payments || []).map((payment) => ({
      id: uid("pay"),
      documentId: doc.id,
      clientId: doc.clientId,
      amount: number(payment.amount),
      method: payment.method || "Efectivo",
      reference: payment.reference || "",
      date: payment.date || doc.createdAt
    }))
  );
  return state;
}

export function nextNumber(state, type) {
  const config = {
    invoice: ["invoicePrefix", "nextInvoice"],
    quote: ["quotePrefix", "nextQuote"],
    order: ["orderPrefix", "nextOrder"],
    creditNote: ["creditNotePrefix", "nextCreditNote"],
    debitNote: ["debitNotePrefix", "nextDebitNote"]
  }[type] || ["invoicePrefix", "nextInvoice"];
  const [prefixKey, seqKey] = config;
  const value = state.settings[seqKey] || 1;
  state.settings[seqKey] = value + 1;
  return `${state.settings[prefixKey]}-${String(value).padStart(6, "0")}`;
}

export function seedState(state) {
  const supplierId = uid("sup");
  const clientId = uid("cli");
  const generalId = uid("cli");
  state.suppliers.push({
    id: supplierId,
    name: "Distribuidora Central",
    rnc: "131000000",
    contact: "Laura Perez",
    phone: "809-555-0101",
    email: "ventas@central.test",
    address: "Av. Principal 100",
    notes: "Proveedor principal de abarrotes",
    createdAt: today(),
    updatedAt: today()
  });
  state.products.push(
    product("Arroz Selecto 1kg", "7790001", "ARR-001", "Abarrotes", "Selecto", 8, 12, 10, 12, 35, 10, supplierId),
    product("Aceite Girasol 900ml", "7790002", "ACE-900", "Abarrotes", "Dorado", 13, 18, 16, 18, 8, 12, supplierId),
    product("Azucar Blanca 1kg", "7790003", "AZU-001", "Abarrotes", "Dulce", 6, 9, 8, 9, 0, 8, supplierId)
  );
  state.clients.push(
    {
      id: generalId,
      name: "Cliente General",
      doc: "0",
      phone: "",
      email: "",
      address: "",
      creditLimit: 0,
      creditDays: 0,
      status: "active",
      notes: "Cliente por defecto para ventas de mostrador",
      lastPurchase: "",
      totalPurchased: 0,
      createdAt: today(),
      updatedAt: today()
    },
    {
      id: clientId,
      name: "Comercial Los Andes",
      doc: "1234567",
      phone: "70000001",
      email: "compras@losandes.test",
      address: "Av. Principal 100",
      creditLimit: 1500,
      creditDays: 30,
      status: "active",
      notes: "Buen historial",
      lastPurchase: dateAdd(today(), -2),
      totalPurchased: 0,
      createdAt: today(),
      updatedAt: today()
    }
  );
}

function product(name, barcode, sku, category, brand, cost, price, wholesalePrice, retailPrice, stock, minStock, supplierId) {
  return {
    id: uid("prod"),
    barcode,
    sku,
    name,
    category,
    brand,
    unit: "Unidad",
    cost,
    price,
    wholesalePrice,
    retailPrice,
    stock,
    minStock,
    status: "active",
    image: "",
    description: "",
    supplierId,
    avgCost: cost,
    createdAt: today(),
    updatedAt: today()
  };
}
