import { verifyPassword, createSession, rateLimit } from "../../_lib/auth.js";
import { execute } from "../../_lib/db.js";
import { assertSameOrigin, fail, HttpError, readJson, requireBinding } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request);
    await rateLimit(request, env, "login");
    const body = await readJson(request);
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!phone || password.length < 1 || password.length > 200) {
      throw new HttpError(400, "Enter your phone number and password.");
    }
    requireBinding(env.SESSION_KV, "session KV");
    const result = await execute(
      env,
      "SELECT id, full_name, phone, password_salt, password_hash, password_iterations, role, status, created_at FROM users WHERE phone = ? LIMIT 1",
      [phone],
    );
    const user = result.rows[0];
    const validPassword = user
      ? await verifyPassword(password, user)
      : (await verifyPassword(password, {
          password_salt: "00112233445566778899aabbccddeeff",
          password_hash: "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
          password_iterations: 310000,
        }), false);
    if (!validPassword) {
      throw new HttpError(401, "Invalid phone number or password.");
    }
    if (user.status !== "active") {
      throw new HttpError(403, user.status === "suspended" ? "This account has been suspended." : "This account is awaiting admin approval.");
    }
    const response = await createSession(request, env, user);
    return response;
  } catch (error) {
    return fail(error);
  }
}
