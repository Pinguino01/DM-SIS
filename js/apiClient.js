const API_BASE_URL = window.DM_SIS_API_URL || "http://localhost:4000/api";

export function getToken() {
  return sessionStorage.getItem("dm_sis_token");
}

export function setToken(token) {
  sessionStorage.setItem("dm_sis_token", token);
}

export function clearToken() {
  sessionStorage.removeItem("dm_sis_token");
}

export async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Error de API" }));
    throw new Error(payload.error || "Error de API");
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (email, password) => apiRequest("/auth/login", { method: "POST", body: { email, password } }),
  me: () => apiRequest("/auth/me"),
  list: (resource) => apiRequest(`/${resource}`),
  create: (resource, data) => apiRequest(`/${resource}`, { method: "POST", body: data }),
  update: (resource, id, data) => apiRequest(`/${resource}/${id}`, { method: "PUT", body: data }),
  remove: (resource, id) => apiRequest(`/${resource}/${id}`, { method: "DELETE" }),
  trialBalance: () => apiRequest("/accounting/trial-balance"),
  financialStatements: () => apiRequest("/accounting/financial-statements")
};
