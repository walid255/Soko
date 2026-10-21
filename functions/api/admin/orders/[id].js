import { requireUser } from "../../../_lib/auth.js";
import { execute } from "../../../_lib/db.js";
import { fail, HttpError, json, readJson } from "../../../_lib/http.js";

export async function onRequestPatch({ request, env, params }) {
  try {
    await requireUser(request, env, "admin");
    const body = await readJson(request);
    if (body.action === "cancel") {
      const result = await execute(
        env,
        "UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND payment_status = 'UNPAID' AND status = 'PENDING_PAYMENT'",
        [params.id],
      );
      if (!result.rowsAffected) throw new HttpError(409, "Only unpaid orders awaiting payment can be cancelled.");
      return json({ updated: true });
    }
    if (body.action === "confirm_manual_payment") {
      const result = await execute(
        env,
        "UPDATE orders SET payment_status = 'PAID', status = 'DISPATCHED', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND payment_status = 'UNPAID' AND status = 'PENDING_PAYMENT'",
        [params.id],
      );
      if (!result.rowsAffected) throw new HttpError(409, "This order is no longer awaiting payment.");
      return json({ updated: true });
    }
    throw new HttpError(400, "Choose a supported order action.");
  } catch (error) {
    return fail(error);
  }
}
