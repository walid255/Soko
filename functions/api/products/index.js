import { execute, publicProduct } from "../../_lib/db.js";
import { fail, json } from "../../_lib/http.js";

export async function onRequestGet({ env }) {
  try {
    const result = await execute(
      env,
      "SELECT id, swahili_name, english_name, category, price_tzs, weight_kg, unit, image_url, hub_availability, is_active FROM products WHERE is_active = 1 ORDER BY category, swahili_name",
    );
    return json({ products: result.rows.map(publicProduct) }, 200, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (error) {
    return fail(error);
  }
}
