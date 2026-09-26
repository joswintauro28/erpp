import { ApiClientError } from "./types";

function getApiBase(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  if (rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")) {
    return rawApiUrl;
  }
  const cleanApi = rawApiUrl.startsWith("/") ? rawApiUrl : `/${rawApiUrl}`;
  return `${basePath}${cleanApi}`;
}

const API_BASE = getApiBase();

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    (window as any).__datavex_access_token = token;
    if (token) {
      localStorage.setItem("datavex_access_token", token);
    } else {
      localStorage.removeItem("datavex_access_token");
    }
    window.dispatchEvent(new CustomEvent("datavex:token-changed", { detail: { token } }));
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    const globalToken = (window as any).__datavex_access_token || localStorage.getItem("datavex_access_token");
    if (globalToken) {
      accessToken = globalToken;
      return globalToken;
    }
  }
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  return getAccessToken();
}

export { API_BASE };

export interface RequestOptions {
  skipAuth?: boolean;
  signal?: AbortSignal;
}

function normalizeRequestPath(path: string): string {
  let p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/api" || p.startsWith("/api/")) {
    p = p.slice(4) || "/";
  }
  return p.startsWith("/") ? p : `/${p}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token && !opts?.skipAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const fullPath = normalizeRequestPath(path);
  const res = await fetch(`${API_BASE}${fullPath}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal: opts?.signal,
  });

  if (res.status === 401 && token && !opts?.skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryRes = await fetch(`${API_BASE}${fullPath}`, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        credentials: "include",
        signal: opts?.signal,
      });
      if (retryRes.ok) return retryRes.json();
      const retryErr = await retryRes.json().catch(() => ({ detail: "Request failed" }));
      throw new ApiClientError(retryRes.status, retryErr.detail || retryErr.message || "Request failed");
    }

    setAccessToken(null);
    throw new ApiClientError(401, "Session expired. Please log in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiClientError(res.status, err.detail || err.message || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PUT", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PATCH", path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, undefined, opts),
};
