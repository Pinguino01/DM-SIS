export const today = () => new Date().toISOString().slice(0, 10);

export const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

export function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(value, currency = "BOB", locale = "es-BO") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(number(value));
}

export function dateAdd(dateString, days) {
  const date = new Date(`${dateString || today()}T00:00:00`);
  date.setDate(date.getDate() + number(days));
  return date.toISOString().slice(0, 10);
}

export function table(headers, rows, emptyText = "No hay datos para mostrar.") {
  if (!rows.length) return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>`;
}

export function badge(text, tone = "") {
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

export function download(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function confirmDialog(title, text = "", confirmButtonText = "Confirmar") {
  const result = await Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb"
  });
  return result.isConfirmed;
}

export async function promptNumber(title, label, defaultValue = 0) {
  const result = await Swal.fire({
    title,
    input: "number",
    inputLabel: label,
    inputValue: defaultValue,
    inputAttributes: { min: 0, step: "0.01" },
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb"
  });
  return result.isConfirmed ? number(result.value) : null;
}

export function toast(title, icon = "success") {
  Swal.fire({
    toast: true,
    position: "top-end",
    timer: 2600,
    showConfirmButton: false,
    title,
    icon
  });
}

export function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}
