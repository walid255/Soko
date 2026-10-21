export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function fail(error) {
  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
  }
  console.error("Unhandled API error", error);
  return json({ error: "An unexpected server error occurred." }, 500);
}

export async function readJson(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  return body;
}

export function requireBinding(value, name) {
  if (!value) {
    throw new HttpError(503, `The ${name} service is not configured.`);
  }
  return value;
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin && ["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  let valid = false;
  try {
    valid = Boolean(origin) && new URL(origin).origin === new URL(request.url).origin;
  } catch {
    valid = false;
  }
  if (!valid) {
    throw new HttpError(403, "Request origin could not be verified.");
  }
}

export function parseCookies(request) {
  const cookie = request.headers.get("Cookie") || "";
  return Object.fromEntries(
    cookie
      .split(";")
      .map((part) => part.trim().split(/=(.*)/s).slice(0, 2))
      .filter(([key, value]) => key && value !== undefined)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

export function setSessionCookie(value, maxAge) {
  const expires = maxAge === 0 ? "; Expires=Thu, 01 Jan 1970 00:00:00 GMT" : "";
  return `__Host-sokosafi_session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}${expires}`;
}
