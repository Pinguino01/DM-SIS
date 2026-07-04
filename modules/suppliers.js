import { confirmDialog, escapeHtml, getFormData, table, today, toast, uid } from "../js/utils.js";

export function renderSuppliers(app) {
  const search = app.filters.supplierSearch || "";
  const suppliers = app.state.suppliers.filter((s) => !search || [s.name, s.rnc, s.contact, s.email].join(" ").toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  app.root.innerHTML = `
    <div class="view-header"><div><h2>Proveedores</h2><p>Contactos y datos comerciales para compras e inventario.</p></div></div>
    <div class="grid two">
      <form class="panel" id="supplierForm"><h3 class="panel-title">Proveedor</h3><input name="id" type="hidden">
        <label>Nombre</label><input name="name" required><div class="row"><div><label>RNC</label><input name="rnc"></div><div><label>Contacto</label><input name="contact"></div></div>
        <div class="row"><div><label>Telefono</label><input name="phone"></div><div><label>Correo</label><input name="email" type="email"></div></div>
        <label>Direccion</label><textarea name="address"></textarea><label>Notas</label><textarea name="notes"></textarea>
        <div class="actions"><button type="submit">Guardar</button><button class="secondary" id="clearSupplier" type="button">Limpiar</button></div></form>
      <div class="panel"><h3 class="panel-title">Listado</h3><div class="filters"><input id="supplierSearch" value="${escapeHtml(search)}" placeholder="Buscar proveedor"><span></span></div>
        ${table(["Proveedor", "Contacto", "Direccion", "Notas", "Acciones"], suppliers.map((s) => `<tr><td><strong>${escapeHtml(s.name)}</strong><br>${escapeHtml(s.rnc || "Sin RNC")}</td><td>${escapeHtml(s.contact || "-")}<br>${escapeHtml(s.phone || "")}<br>${escapeHtml(s.email || "")}</td><td>${escapeHtml(s.address || "-")}</td><td>${escapeHtml(s.notes || "")}</td><td class="table-actions"><button class="secondary" data-edit-supplier="${s.id}" type="button">Editar</button><button class="danger" data-delete-supplier="${s.id}" type="button">Eliminar</button></td></tr>`))}
      </div></div>`;
  document.getElementById("supplierSearch").addEventListener("input", (e) => app.setFilter("supplierSearch", e.target.value));
  document.getElementById("clearSupplier").addEventListener("click", () => document.getElementById("supplierForm").reset());
  document.getElementById("supplierForm").addEventListener("submit", (event) => {
    event.preventDefault(); const data = getFormData(event.currentTarget); const existing = app.supplier(data.id);
    const payload = { id: data.id || uid("sup"), name: data.name.trim(), rnc: data.rnc.trim(), contact: data.contact.trim(), phone: data.phone.trim(), email: data.email.trim(), address: data.address.trim(), notes: data.notes.trim(), createdAt: existing?.createdAt || today(), updatedAt: today() };
    app.state.suppliers = app.state.suppliers.filter((s) => s.id !== payload.id).concat(payload); app.save(); app.render(); toast("Proveedor guardado");
  });
  app.root.querySelectorAll("[data-edit-supplier]").forEach((b) => b.addEventListener("click", () => { const s = app.supplier(b.dataset.editSupplier); const f = document.getElementById("supplierForm"); Object.entries(s).forEach(([k, v]) => { if (f.elements[k]) f.elements[k].value = v ?? ""; }); }));
  app.root.querySelectorAll("[data-delete-supplier]").forEach((b) => b.addEventListener("click", async () => { if (!(await confirmDialog("Eliminar proveedor", "", "Eliminar"))) return; app.state.suppliers = app.state.suppliers.filter((s) => s.id !== b.dataset.deleteSupplier); app.save(); app.render(); }));
}
