import { requireUser } from "../../../_lib/auth.js";
import { execute } from "../../../_lib/db.js";
import { fail, HttpError, json, readJson } from "../../../_lib/http.js";

function validateProduct(body) {
  for (const field of ["swahiliName", "englishName", "category", "unit", "image"]) {
    if (typeof body[field] !== "string" || !body[field].trim() || body[field].length > 1024) {
      throw new HttpError(400, `Enter a valid ${field}.`);
    }
    if (!/^\/api\/media\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(body.image) && !/^https:\/\/images\.unsplash\.com\/[a-z0-9-]+(?:\?.*)?$/i.test(body.image)) {
      throw new HttpError(400, "Use an uploaded image or a trusted HTTPS image URL.");
    }
  }
  if (!Number.isSafeInteger(body.priceTZS) || body.priceTZS <= 0 || body.priceTZS > 100000000) {
    throw new HttpError(400, "Enter a valid product price.");
  }
  if (typeof body.weightKg !== "number" || !Number.isFinite(body.weightKg) || body.weightKg <= 0 || body.weightKg > 100000) {
    throw new HttpError(400, "Enter a valid product weight.");
  }
  if (!Array.isArray(body.hubAvailability) || body.hubAvailability.length > 20 || body.hubAvailability.some((hub) => typeof hub !== "string" || hub.length > 100)) {
    throw new HttpError(400, "Choose valid product hubs.");
  }
  if (typeof body.isActive !== "boolean") throw new HttpError(400, "Product active status is required.");
}

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
