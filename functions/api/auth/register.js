import { hashPassword, rateLimit, createSession } from "../../_lib/auth.js";
import { execute, publicUser } from "../../_lib/db.js";
import { assertSameOrigin, fail, HttpError, json, readJson, requireBinding } from "../../_lib/http.js";

const ALLOWED_ROLES = new Set(["vendor", "driver", "aggregator"]);

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request);
    await rateLimit(request, env, "register", 5);
    const { fullName, phone, role, password } = await readJson(request);
    if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 120) {
      throw new HttpError(400, "Enter a name between 2 and 120 characters.");
    }
    if (typeof phone !== "string" || !/^[+0-9 ()-]{8,24}$/.test(phone.trim())) {
      throw new HttpError(400, "Enter a valid phone number.");
    }
    if (!ALLOWED_ROLES.has(role)) throw new HttpError(400, "Choose a valid account role.");
    if (typeof password !== "string" || password.length < 12 || password.length > 200) {
      throw new HttpError(400, "Password must contain at least 12 characters.");
    }
    requireBinding(env.SESSION_KV, "session KV");
    const id = crypto.randomUUID();
    const status = role === "vendor" ? "active" : "pending_approval";
    const { salt, hash, iterations } = await hashPassword(password);
    try {
      await execute(
        env,
        "INSERT INTO users (id, full_name, phone, password_salt, password_hash, password_iterations, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, fullName.trim(), phone.trim(), salt, hash, iterations, role, status],
      );
    } catch (error) {
      if (error.status === 503) throw error;
      if (error.status === 409) {
        throw new HttpError(409, "This phone number is already registered.");
      }
      throw error;
    }
    if (status !== "active") {
      return json({ pendingApproval: true }, 201);
    }
    const user = {
      id,
      full_name: fullName.trim(),
      phone: phone.trim(),
      role,
      status,
      created_at: new Date(),
    };
    const response = await createSession(request, env, user);
    response.headers.set("X-Account-Status", "active");
    response.headers.set("X-User-Id", id);
    response.headers.set("X-User-Name", encodeURIComponent(user.full_name));
    response.headers.set("X-User-Phone", encodeURIComponent(user.phone));
    response.headers.set("X-User-Role", role);
    response.headers.set("X-User-Created", user.created_at.toISOString());
    return response;
  } catch (error) {
    return fail(error);
  }
}
