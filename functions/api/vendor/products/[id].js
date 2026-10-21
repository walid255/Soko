import { requireUser } from "../../../_lib/auth.js";
import { execute } from "../../../_lib/db.js";
import { fail, HttpError, json, readJson } from "../../../_lib/http.js";
import { validateProduct } from "../../../_lib/products.js";

async function requireOwnedProduct(env, productId, vendorId) {
  const result = await execute(
    env,
    "SELECT id FROM products WHERE id = ? AND vendor_id = ? LIMIT 1",
    [productId, vendorId],
  );
  if (!result.rows.length) throw new HttpError(404, "Product not found.");
}

export async function onRequestPut({ request, env, params }) {
  try {
    const session = await requireUser(request, env, "vendor");
    const body = await readJson(request);
    validateProduct(body);
    await requireOwnedProduct(env, params.id, session.user.id);
    await execute(
      env,
      "UPDATE products SET swahili_name = ?, english_name = ?, category = ?, price_tzs = ?, weight_kg = ?, unit = ?, image_url = ?, hub_availability = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND vendor_id = ?",
      [
        body.swahiliName.trim(),
        body.englishName.trim(),
        body.category.trim(),
        body.priceTZS,
        body.weightKg,
        body.unit.trim(),
        body.image.trim(),
        JSON.stringify(body.hubAvailability),
        body.isActive ? 1 : 0,
        params.id,
        session.user.id,
      ],
    );
    return json({ updated: true });
  } catch (error) {
    return fail(error);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const session = await requireUser(request, env, "vendor");
    await requireOwnedProduct(env, params.id, session.user.id);
    await execute(
      env,
      "UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND vendor_id = ?",
      [params.id, session.user.id],
    );
    return json({ archived: true });
  } catch (error) {
    return fail(error);
  }
}
