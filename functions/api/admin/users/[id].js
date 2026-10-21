import { requireUser } from "../../../_lib/auth.js";
import { execute } from "../../../_lib/db.js";
import { fail, HttpError, json, readJson } from "../../../_lib/http.js";

const ROLES = new Set(["vendor", "driver", "aggregator", "admin"]);
const STATUSES = new Set(["active", "pending_approval", "suspended"]);

export async function onRequestPatch({ request, env, params }) {
  try {
    const session = await requireUser(request, env, "admin");
    const body = await readJson(request);
    const updates = [];
    const values = [];
    if (Object.hasOwn(body, "role")) {
      if (!ROLES.has(body.role)) throw new HttpError(400, "Invalid user role.");
      if (params.id === session.user.id && body.role !== "admin") {
        throw new HttpError(400, "You cannot remove your own admin role.");
      }
      updates.push("role = ?");
      values.push(body.role);
    }
    if (Object.hasOwn(body, "status")) {
      if (!STATUSES.has(body.status)) throw new HttpError(400, "Invalid account status.");
      if (params.id === session.user.id && body.status !== "active") {
        throw new HttpError(400, "You cannot suspend your own admin account.");
      }
      updates.push("status = ?");
      values.push(body.status);
    }
    if (!updates.length) throw new HttpError(400, "No user changes were provided.");
    values.push(params.id);
    const result = await execute(env, `UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
    if (!result.rowsAffected) throw new HttpError(404, "User not found.");
    return json({ updated: true });
  } catch (error) {
    return fail(error);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const session = await requireUser(request, env, "admin");
    if (params.id === session.user.id) throw new HttpError(400, "You cannot delete your own admin account.");
    const target = await execute(env, "SELECT role FROM users WHERE id = ? LIMIT 1", [params.id]);
    if (!target.rows[0]) throw new HttpError(404, "User not found.");
    if (target.rows[0].role === "admin") {
      const admins = await execute(env, "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'");
      if (Number(admins.rows[0]?.count || 0) <= 1) throw new HttpError(409, "The last active admin account cannot be deleted.");
    }
    const result = await execute(
      env,
      "DELETE FROM users WHERE id = ? AND NOT EXISTS (SELECT 1 FROM orders WHERE user_id = ?)",
      [params.id, params.id],
    );
    if (!result.rowsAffected) throw new HttpError(409, "Users with order history cannot be deleted.");
    return json({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
