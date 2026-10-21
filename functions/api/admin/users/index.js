import { requireUser } from "../../../_lib/auth.js";
import { execute, publicUser } from "../../../_lib/db.js";
import { fail, json } from "../../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    await requireUser(request, env, "admin");
    const result = await execute(
      env,
      "SELECT id, full_name, phone, role, status, created_at FROM users ORDER BY created_at DESC",
    );
    return json({ users: result.rows.map(publicUser) });
  } catch (error) {
    return fail(error);
  }
}
