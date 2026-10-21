import { requireUser } from "../../../_lib/auth.js";
import { execute, publicOrder } from "../../../_lib/db.js";
import { fail, json } from "../../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    await requireUser(request, env, "admin");
    const result = await execute(
      env,
      "SELECT id, user_id, items_json, total_tzs, weight_kg, status, payment_status, payment_method, payment_phone, hub, delivery_slot, created_at FROM orders ORDER BY created_at DESC LIMIT 500",
    );
    return json({ orders: result.rows.map((row) => publicOrder(row)) });
  } catch (error) {
    return fail(error);
  }
}
