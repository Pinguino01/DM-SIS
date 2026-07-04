import { getFormData, imageToDataUrl, toast } from "../js/utils.js";

export function renderSettings(app) {
  const s = app.state.settings;
  app.root.innerHTML = `
    <div class="view-header"><div><h2>Configuracion</h2><p>Empresa, impuestos, numeracion, formato e integracion futura.</p></div></div>
    <form class="panel" id="settingsForm">
      <h3 class="panel-title">Empresa</h3>
      <div class="row"><div><label>Nombre</label><input name="companyName" value="${s.companyName || ""}" required></div><div><label>Logo</label><input name="logoFile" type="file" accept="image/*"></div></div>
      ${s.logo ? `<img class="image-preview" src="${s.logo}" alt="Logo">` : ""}
      <div class="row three"><div><label>Direccion</label><input name="address" value="${s.address || ""}"></div><div><label>Telefono</label><input name="phone" value="${s.phone || ""}"></div><div><label>Correo</label><input name="email" type="email" value="${s.email || ""}"></div></div>
      <h3 class="section-title">Facturacion</h3>
      <div class="row three"><div><label>Moneda</label><select name="currency"><option value="BOB">BOB</option><option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div><div><label>Impuesto %</label><input name="taxRate" type="number" min="0" step="0.01" value="${s.taxRate}"></div><div><label>Formato factura</label><select name="invoiceFormat"><option>Carta</option><option>Ticket 80mm</option><option>A4</option></select></div></div>
      <div class="row three"><div><label>Prefijo factura</label><input name="invoicePrefix" value="${s.invoicePrefix}"></div><div><label>Proxima factura</label><input name="nextInvoice" type="number" min="1" value="${s.nextInvoice}"></div><div><label>Prefijo cotizacion</label><input name="quotePrefix" value="${s.quotePrefix}"></div></div>
      <div class="row three"><div><label>Prefijo pedido</label><input name="orderPrefix" value="${s.orderPrefix}"></div><div><label>Prefijo nota credito</label><input name="creditNotePrefix" value="${s.creditNotePrefix}"></div><div><label>Prefijo nota debito</label><input name="debitNotePrefix" value="${s.debitNotePrefix}"></div></div>
      <h3 class="section-title">Preparado para integracion</h3>
      <div class="row"><div><label>Token de intercambio</label><input name="integrationToken" value="${s.integrationToken}" readonly></div><div><label>Endpoint futuro de sincronizacion</label><input name="syncEndpoint" value="${s.syncEndpoint || ""}" placeholder="https://api.empresa.com/sync"></div></div>
      <div class="notice">Este sistema expone datos exportables de facturacion, clientes, inventario, pagos y compras para una futura API o sincronizacion. No incluye contabilidad, asientos, libro diario, mayor ni estados financieros.</div>
      <div class="actions"><button type="submit">Guardar configuracion</button><button class="secondary" type="button" id="printSettings">Impresion de prueba</button></div>
    </form>`;
  document.querySelector("[name='currency']").value = s.currency;
  document.querySelector("[name='invoiceFormat']").value = s.invoiceFormat;
  document.getElementById("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = getFormData(event.currentTarget);
    const file = event.currentTarget.logoFile.files[0];
    app.state.settings = { ...app.state.settings, ...data, logo: file ? await imageToDataUrl(file) : app.state.settings.logo, taxRate: Number(data.taxRate), nextInvoice: Number(data.nextInvoice) };
    app.save(); app.render(); toast("Configuracion guardada");
  });
  document.getElementById("printSettings").addEventListener("click", () => window.print());
}
