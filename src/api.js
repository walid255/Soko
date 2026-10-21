let csrfToken = null;

export function setCsrfToken(value) {
  csrfToken = value || null;
}

export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
    body:
      options.body === undefined || options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body),
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }
  return payload;
}
