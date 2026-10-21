import { hashPassword } from "../../_lib/auth.js";
import { execute } from "../../_lib/db.js";
import { assertSameOrigin, fail, HttpError, json, readJson, requireBinding } from "../../_lib/http.js";

function equalSecret(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string" || actual.length !== expected.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request);
    const expectedToken = env.BOOTSTRAP_ADMIN_TOKEN;
    if (!expectedToken || expectedToken.length < 32) {
      throw new HttpError(503, "Admin bootstrap is not configured.");
    }
    if (!equalSecret(request.headers.get("X-Bootstrap-Token"), expectedToken)) {
      throw new HttpError(403, "Invalid bootstrap token.");
    }
    const { fullName, phone, password } = await readJson(request);
    if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 120) {
      throw new HttpError(400, "Enter a valid admin name.");
    }
    if (typeof phone !== "string" || !/^[+0-9 ()-]{8,24}$/.test(phone.trim())) {
      throw new HttpError(400, "Enter a valid phone number.");
    }
    if (typeof password !== "string" || password.length < 12 || password.length > 200) {
      throw new HttpError(400, "Admin password must contain at least 12 characters.");
    }
    requireBinding(env.SESSION_KV, "session KV");
    const existingAdmin = await execute(env, "SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existingAdmin.rows.length) throw new HttpError(409, "An administrator account already exists.");
    const id = crypto.randomUUID();
    try {
      await execute(env, "INSERT INTO admin_bootstrap_lock (id, owner_id) VALUES (1, ?)", [id]);
    } catch (error) {
      if (error.status === 409) throw new HttpError(409, "Admin bootstrap has already been completed.");
      throw error;
    }
    const { salt, hash, iterations } = await hashPassword(password);
    try {
      await execute(
        env,
        "INSERT INTO users (id, full_name, phone, password_salt, password_hash, password_iterations, role, status) VALUES (?, ?, ?, ?, ?, ?, 'admin', 'active')",
        [id, fullName.trim(), phone.trim(), salt, hash, iterations],
      );
    } catch (error) {
      await execute(env, "DELETE FROM admin_bootstrap_lock WHERE id = 1 AND owner_id = ?", [id]);
      throw error;
    }
    return json({ created: true }, 201);
  } catch (error) {
    return fail(error);
  }
}
