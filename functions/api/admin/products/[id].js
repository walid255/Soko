import { requireUser } from "../../../_lib/auth.js";
import { execute } from "../../../_lib/db.js";
import { fail, HttpError, json, readJson } from "../../../_lib/http.js";
import { validateProduct } from "../../../_lib/products.js";

export async function onRequestPut({ request, env, params }) {
  try {
    await requireUser(request, env, "admin");
    const body = await readJson(request);
    validateProduct(body);
    const result = await execute(
      env,
      "UPDATE products SET swahili_name = ?, english_name = ?, category = ?, price_tzs = ?, weight_kg = ?, unit = ?, image_url = ?, hub_availability = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [body.swahiliName.trim(), body.englishName.trim(), body.category.trim(), body.priceTZS, body.weightKg, body.unit.trim(), body.image.trim(), JSON.stringify(body.hubAvailability), body.isActive ? 1 : 0, params.id],
    );
    if (!result.rowsAffected) throw new HttpError(404, "Product not found.");
    return json({ updated: true });
  } catch (error) {
    return fail(error);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    await requireUser(request, env, "admin");
    const result = await execute(env, "UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [params.id]);
    if (!result.rowsAffected) throw new HttpError(404, "Product not found.");
    return json({ archived: true });
  } catch (error) {
    return fail(error);
  }
}
