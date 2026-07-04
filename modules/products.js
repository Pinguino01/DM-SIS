import { badge, confirmDialog, escapeHtml, getFormData, imageToDataUrl, number, table, today, toast, uid } from "../js/utils.js";

export function renderProducts(app) {
  const search = app.filters.productSearch || "";
  const status = app.filters.productStatus || "all";
  const suppliers = app.state.suppliers;
  const products = app.state.products
    .filter((p) => !search || [p.name, p.sku, p.barcode, p.category, p.brand].join(" ").toLowerCase().includes(search.toLowerCase()))
    .filter((p) => status === "all" || p.status === status || (status === "low" && number(p.stock) <= number(p.minStock)) || (status === "out" && number(p.stock) <= 0))
    .sort((a, b) => a.name.localeCompare(b.name));

  app.root.innerHTML = `
    <div class="view-header">
      <div><h2>Productos</h2><p>Catalogo con SKU, codigo de barras, precios, costos e imagen.</p></div>
    </div>
    <div class="grid two">
      <form class="panel" id="productForm">
        <h3 class="panel-title">Producto</h3>
        <input name="id" type="hidden">
        <label>Nombre</label><input name="name" required>
        <div class="row"><div><label>Codigo de barras</label><input name="barcode"></div><div><label>SKU</label><input name="sku"></div></div>
        <div class="row"><div><label>Categoria</label><input name="category"></div><div><label>Marca</label><input name="brand"></div></div>
        <div class="row three"><div><label>Unidad</label><input name="unit" value="Unidad"></div><div><label>Estado</label><select name="status"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div><div><label>Proveedor principal</label><select name="supplierId"><option value="">Sin proveedor</option>${suppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}</select></div></div>
        <div class="row three"><div><label>Costo</label><input name="cost" type="number" min="0" step="0.01"></div><div><label>Precio mayorista</label><input name="wholesalePrice" type="number" min="0" step="0.01"></div><div><label>Precio minorista</label><input name="retailPrice" type="number" min="0" step="0.01"></div></div>
        <div class="row three"><div><label>Precio general</label><input name="price" type="number" min="0" step="0.01" required></div><div><label>Stock actual</label><input name="stock" type="number" min="0" step="1" required></div><div><label>Stock minimo</label><input name="minStock" type="number" min="0" step="1" value="5"></div></div>
        <label>Imagen del producto</label><input name="imageFile" type="file" accept="image/*">
        <label>Descripcion</label><textarea name="description"></textarea>
        <div class="actions"><button type="submit">Guardar</button><button class="secondary" id="clearProduct" type="button">Limpiar</button></div>
      </form>
      <div class="panel">
        <h3 class="panel-title">Inventario de productos</h3>
        <div class="filters"><input value="${escapeHtml(search)}" id="productSearch" placeholder="Buscar producto, SKU o codigo"><select id="productStatus"><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="low">Bajo minimo</option><option value="out">Agotados</option></select></div>
        ${table(["Producto", "Categoria", "Marca", "Precios", "Stock", "Fechas", "Acciones"], products.map((p) => row(app, p)))}
      </div>
    </div>`;

  document.getElementById("productStatus").value = status;
  document.getElementById("productSearch").addEventListener("input", (e) => app.setFilter("productSearch", e.target.value));
  document.getElementById("productStatus").addEventListener("change", (e) => app.setFilter("productStatus", e.target.value));
  document.getElementById("clearProduct").addEventListener("click", () => document.getElementById("productForm").reset());
  document.getElementById("productForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = getFormData(event.currentTarget);
    const file = event.currentTarget.imageFile.files[0];
    const existing = app.product(data.id);
    const payload = {
      id: data.id || uid("prod"),
      barcode: data.barcode.trim(),
      sku: data.sku.trim(),
      name: data.name.trim(),
      category: data.category.trim(),
      brand: data.brand.trim(),
      unit: data.unit.trim() || "Unidad",
      cost: number(data.cost),
      price: number(data.price),
      wholesalePrice: number(data.wholesalePrice || data.price),
      retailPrice: number(data.retailPrice || data.price),
      stock: number(data.stock),
      minStock: number(data.minStock),
      status: data.status,
      image: file ? await imageToDataUrl(file) : (existing?.image || ""),
      description: data.description.trim(),
      supplierId: data.supplierId,
      avgCost: number(existing?.avgCost || data.cost),
      createdAt: existing?.createdAt || today(),
      updatedAt: today()
    };
    app.state.products = app.state.products.filter((p) => p.id !== payload.id).concat(payload);
    app.save();
    app.render();
    toast("Producto guardado");
  });
  app.root.querySelectorAll("[data-edit-product]").forEach((button) => button.addEventListener("click", () => fillProduct(app, button.dataset.editProduct)));
  app.root.querySelectorAll("[data-delete-product]").forEach((button) => button.addEventListener("click", async () => {
    const id = button.dataset.deleteProduct;
    if (app.state.documents.some((doc) => doc.items.some((item) => item.productId === id))) return toast("No se puede eliminar un producto facturado", "warning");
    if (!(await confirmDialog("Eliminar producto", "Esta accion no afecta facturas ya emitidas.", "Eliminar"))) return;
    app.state.products = app.state.products.filter((p) => p.id !== id);
    app.save();
    app.render();
  }));
}

function row(app, p) {
  const supplier = app.supplier(p.supplierId);
  const tone = p.stock <= 0 ? "danger" : p.stock <= p.minStock ? "warning" : "success";
  return `<tr>
    <td><div class="product-cell"><img class="thumb" src="${p.image || "assets/product-placeholder.svg"}" alt=""><div><strong>${escapeHtml(p.name)}</strong><br><span class="muted">${escapeHtml(p.sku || "Sin SKU")} · ${escapeHtml(p.barcode || "Sin barra")}</span><br>${p.status === "active" ? badge("Activo", "success") : badge("Inactivo", "dark")}</div></div></td>
    <td>${escapeHtml(p.category || "-")}</td><td>${escapeHtml(p.brand || "-")}<br><span class="muted">${supplier ? escapeHtml(supplier.name) : ""}</span></td>
    <td>General: ${app.money(p.price)}<br>Mayor: ${app.money(p.wholesalePrice)}<br>Menor: ${app.money(p.retailPrice)}</td>
    <td>${badge(String(p.stock), tone)}<br><span class="muted">Min. ${p.minStock}</span></td>
    <td>Creado: ${p.createdAt}<br>Mod.: ${p.updatedAt}</td>
    <td class="table-actions"><button class="secondary" data-edit-product="${p.id}" type="button">Editar</button><button class="danger" data-delete-product="${p.id}" type="button">Eliminar</button></td>
  </tr>`;
}

function fillProduct(app, id) {
  const p = app.product(id);
  const form = document.getElementById("productForm");
  Object.entries(p).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}
