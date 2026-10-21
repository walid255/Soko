import { execute, publicUser } from "./db.js";
import {
  assertSameOrigin,
  HttpError,
  parseCookies,
  requireBinding,
  setSessionCookie,
} from "./http.js";

const SESSION_COOKIE = "__Host-sokosafi_session";
const SESSION_TTL = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 310000;

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  if (typeof value !== "string" || !/^(?:[a-f0-9]{2})+$/i.test(value)) {
    throw new HttpError(401, "Invalid credentials.");
  }
  return Uint8Array.from(value.match(/.{2}/g), (byte) => parseInt(byte, 16));
}

async function derivePassword(password, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    material,
    256,
  );
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  return {
    salt: bytesToHex(salt),
    hash: bytesToHex(hash),
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(password, row) {
  return verifySecret(
    password,
    row.password_salt,
    row.password_hash,
    Number(row.password_iterations),
  );
}

export async function verifySecret(value, saltHex, hashHex, iterations) {
  if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 1000000) {
    return false;
  }
  const salt = hexToBytes(saltHex);
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    material,
    256,
  );
  const expected = hexToBytes(hashHex);
  const actual = new Uint8Array(hash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

export async function rateLimit(request, env, prefix, maximum = 10) {
  const kv = requireBinding(env.APP_KV, "Workers KV");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const bucket = Math.floor(Date.now() / 60000);
  const key = `rate:${prefix}:${ip}:${bucket}`;
  const count = Number((await kv.get(key)) || 0);
  if (count >= maximum) throw new HttpError(429, "Too many attempts. Please try again shortly.");
  await kv.put(key, String(count + 1), { expirationTtl: 90 });
}

export async function createSession(request, env, user) {
  const kv = requireBinding(env.SESSION_KV, "session KV");
  const id = crypto.randomUUID();
  const csrfToken = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  await kv.put(`session:${id}`, JSON.stringify({ userId: user.id, csrfToken }), {
    expirationTtl: SESSION_TTL,
  });
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": setSessionCookie(id, SESSION_TTL) },
  });
}

export async function readSession(request, env, { requireCsrf = false } = {}) {
  const kv = requireBinding(env.SESSION_KV, "session KV");
  const id = parseCookies(request)[SESSION_COOKIE];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    if (requireCsrf) throw new HttpError(401, "Please sign in.");
    return null;
  }
  const saved = await kv.get(`session:${id}`);
  if (!saved) {
    if (requireCsrf) throw new HttpError(401, "Your session has expired.");
    return null;
  }
  const session = JSON.parse(saved);
  if (requireCsrf) {
    assertSameOrigin(request);
    const token = request.headers.get("X-CSRF-Token");
    if (!token || token !== session.csrfToken) {
      throw new HttpError(403, "Your request could not be verified.");
    }
  }
  const result = await execute(
    env,
    "SELECT id, full_name, phone, role, status, created_at FROM users WHERE id = ? LIMIT 1",
    [session.userId],
  );
  const row = result.rows[0];
  if (!row || row.status !== "active") {
    await kv.delete(`session:${id}`);
    if (requireCsrf) throw new HttpError(401, "This account is not active.");
    return null;
  }
  return {
    id,
    csrfToken: session.csrfToken,
    user: publicUser(row),
  };
}

export async function requireUser(request, env, role) {
  const session = await readSession(request, env, { requireCsrf: true });
  if (!session) throw new HttpError(401, "Please sign in.");
  if (role && session.user.role !== role) {
    throw new HttpError(403, "You do not have permission to do that.");
  }
  return session;
}

export async function destroySession(request, env) {
  const kv = requireBinding(env.SESSION_KV, "session KV");
  const id = parseCookies(request)[SESSION_COOKIE];
  if (id && /^[0-9a-f-]{36}$/i.test(id)) await kv.delete(`session:${id}`);
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": setSessionCookie("", 0) },
  });
}

export { PASSWORD_ITERATIONS };
