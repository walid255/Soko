import { rateLimit, requireUser, verifySecret } from "../../../_lib/auth.js";
import { execute } from "../../../_lib/db.js";
import { fail, HttpError, json, readJson } from "../../../_lib/http.js";

export async function onRequestPost({ request, env, params }) {
  try {
    const session = await requireUser(request, env);
    if (!["driver", "admin"].includes(session.user.role)) {
      throw new HttpError(403, "Only drivers can confirm a delivery.");
    }
    await rateLimit(request, env, "delivery-pin", 10);
    const { pin } = await readJson(request);
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      throw new HttpError(400, "Enter the four-digit delivery PIN.");
    }
    const result = await execute(
      env,
      "SELECT id, pin_salt, pin_hash, status FROM orders WHERE id = ? LIMIT 1",
      [params.id],
    );
    const order = result.rows[0];
    if (!order || order.status !== "DISPATCHED") throw new HttpError(404, "Active delivery not found.");
    const [iterations, hash] = order.pin_hash.split(":");
    if (!(await verifySecret(pin, order.pin_salt, hash, Number(iterations)))) {
      throw new HttpError(400, "The delivery PIN is incorrect.");
    }
    await execute(
      env,
      "UPDATE orders SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND status = 'DISPATCHED'",
      [params.id],
    );
    return json({ delivered: true });
  } catch (error) {
    return fail(error);
  }
}
