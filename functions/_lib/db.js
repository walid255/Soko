import { connect } from "@planetscale/database";
import { HttpError, requireBinding } from "./http.js";

export function getDatabase(env) {
  const url = requireBinding(env.DATABASE_URL, "PlanetScale database");
  return connect({ url });
}

export async function execute(env, query, params = []) {
  try {
    const db = getDatabase(env);
    return await db.execute(query, params);
  } catch (error) {
    console.error("PlanetScale query failed", error);
    if (String(error.message).includes("Duplicate entry")) {
      throw new HttpError(409, "A record with this value already exists.");
    }
    throw new HttpError(503, "The database is temporarily unavailable.");
  }
}

export function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    regDate: new Date(row.created_at).toISOString(),
  };
}

export function publicProduct(row) {
  let hubAvailability;
  try {
    hubAvailability = JSON.parse(row.hub_availability);
  } catch {
    console.error("Invalid hub availability JSON for product", row.id);
    throw new HttpError(503, "Product catalog data is invalid.");
  }
  if (!Array.isArray(hubAvailability) || !hubAvailability.every((hub) => typeof hub === "string")) {
    console.error("Invalid hub availability data for product", row.id);
    throw new HttpError(503, "Product catalog data is invalid.");
  }
  return {
    id: row.id,
    swahiliName: row.swahili_name,
    englishName: row.english_name,
    category: row.category,
    priceTZS: Number(row.price_tzs),
    weightKg: Number(row.weight_kg),
    unit: row.unit,
    image: row.image_url,
    hubAvailability,
    isActive: Boolean(row.is_active),
  };
}

export function publicOrder(row, includePin = false) {
  let items = [];
  try {
    items = JSON.parse(row.items_json);
  } catch {
    console.error("Invalid items JSON for order", row.id);
    throw new HttpError(503, "Order data is invalid.");
  }
  if (!Array.isArray(items)) {
    console.error("Invalid order items data for order", row.id);
    throw new HttpError(503, "Order data is invalid.");
  }
  return {
    id: row.id,
    userId: row.user_id,
    date: new Date(row.created_at).toISOString(),
    items,
    totalTZS: Number(row.total_tzs),
    weightKg: Number(row.weight_kg),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentPhone: row.payment_phone,
    hub: row.hub,
    slot: row.delivery_slot,
    ...(includePin && row.delivery_pin ? { pin: row.delivery_pin } : {}),
  };
}
