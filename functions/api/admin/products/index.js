import { requireUser } from "../../../_lib/auth.js";
import { execute, publicProduct } from "../../../_lib/db.js";
import { fail, json, readJson } from "../../../_lib/http.js";
import { validateProduct } from "../../../_lib/products.js";

export async function onRequestGet({ request, env }) {
  try {
    await requireUser(request, env, "admin");
    const result = await execute(
      env,
      "SELECT id, swahili_name, english_name, category, price_tzs, weight_kg, unit, image_url, hub_availability, is_active FROM products ORDER BY created_at DESC",
    );
    return json({ products: result.rows.map(publicProduct) });
  } catch (error) {
    return fail(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await requireUser(request, env, "admin");
    const body = await readJson(request);
    validateProduct(body);
    const id = crypto.randomUUID();
    await execute(
      env,
      "INSERT INTO products (id, vendor_id, swahili_name, english_name, category, price_tzs, weight_kg, unit, image_url, hub_availability, is_active) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, body.swahiliName.trim(), body.englishName.trim(), body.category.trim(), body.priceTZS, body.weightKg, body.unit.trim(), body.image.trim(), JSON.stringify(body.hubAvailability), body.isActive ? 1 : 0],
    );
    return json({ id }, 201);
  } catch (error) {
    return fail(error);
  }
}
