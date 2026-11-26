const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://192.168.2.98:8000/api").replace(/\/$/, "");
const SESSION_KEY = "yahataAuthSession";

function normalizeSession(raw) {
  if (!raw || !raw.token) return null;
  return {
    user: raw.user || raw.name || raw.username || "User",
    username: raw.username || "",
    name: raw.name || raw.user || "",
    nik: raw.nik || "",
    role: raw.role || "operator",
    area: raw.area || (raw.role === "admin" ? "Production Admin" : "Production Area"),
    token: raw.token,
    tokenType: raw.tokenType || "Bearer",
    expiresAt: raw.expiresAt || null,
    loggedInAt: raw.loggedInAt || new Date().toISOString(),
    permissions: raw.permissions || null,
  };
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function storeSession(session) {
  const normalized = normalizeSession(session);
  if (!normalized) return null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

function buildHeaders(options = {}) {
  const headers = new Headers(options.headers || {});
  const session = getStoredSession();
  if (session?.token) {
    headers.set("Authorization", `${session.tokenType || "Bearer"} ${session.token}`);
  }
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  return headers;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

function extractMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (payload.message) return payload.message;
  if (payload.error) return payload.error;
  if (payload.errors && typeof payload.errors === "object") {
    const first = Object.values(payload.errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return fallback;
}

function notifyAuthExpired() {
  clearStoredSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yahata:auth-expired"));
  }
}

// Request GET yang identik dan sedang berjalan digabung jadi satu (mencegah request ganda,
// mis. efek React StrictMode di mode dev atau muat ulang beruntun). Hanya untuk GET tanpa body.
const inflightGets = new Map();

export function apiRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET" || options.body) return apiRequestRaw(path, options);

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getStoredSession()?.token || "";
  const key = `${token}|${url}`;

  if (inflightGets.has(key)) return inflightGets.get(key);

  const promise = apiRequestRaw(path, options).finally(() => inflightGets.delete(key));
  inflightGets.set(key, promise);
  return promise;
}

async function apiRequestRaw(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
  });
  const payload = await parseResponse(response);

  if (response.status === 401) {
    notifyAuthExpired();
  }

  if (!response.ok) {
    const error = new Error(extractMessage(payload, `Request gagal (${response.status})`));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function apiDownload(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
  });
  if (response.status === 401) {
    notifyAuthExpired();
  }
  if (!response.ok) {
    const payload = await parseResponse(response);
    const error = new Error(extractMessage(payload, `Download gagal (${response.status})`));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  const filename = match ? decodeURIComponent(match[1].replace(/\"/g, "")) : "download.csv";
  return { blob, filename };
}

export function unwrapData(payload) {
  if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

export function unwrapCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}