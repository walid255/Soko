import { requireUser, hashPassword } from "../../_lib/auth.js";
import { execute, publicOrder } from "../../_lib/db.js";
import { fail, HttpError, json, readJson } from "../../_lib/http.js";

const PAYMENT_METHODS = new Set(["M-Pesa", "Airtel Money", "Tigo Pesa"]);

export async function onRequestGet({ request, env }) {
  try {
    const session = await requireUser(request, env);
    let result;
    if (session.user.role === "admin") {
      result = await execute(
        env,
        "SELECT id, user_id, items_json, total_tzs, weight_kg, status, payment_status, payment_method, payment_phone, hub, delivery_slot, created_at FROM orders ORDER BY created_at DESC LIMIT 500",
      );
    } else if (session.user.role === "driver") {
      result = await execute(
        env,
        "SELECT id, user_id, items_json, total_tzs, weight_kg, status, payment_status, payment_method, payment_phone, hub, delivery_slot, created_at FROM orders WHERE status = 'DISPATCHED' ORDER BY created_at DESC LIMIT 200",
      );
    } else {
      result = await execute(
        env,
        "SELECT id, user_id, items_json, total_tzs, weight_kg, status, payment_status, payment_method, payment_phone, hub, delivery_slot, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
        [session.user.id],
      );
    }
    return json({ orders: result.rows.map((row) => publicOrder(row)) });
  } catch (error) {
    return fail(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const session = await requireUser(request, env);
    if (session.user.role !== "vendor") throw new HttpError(403, "Only vendors can place orders.");
    const body = await readJson(request);
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
      throw new HttpError(400, "Choose between 1 and 50 products.");
    }
    if (typeof body.hub !== "string" || body.hub.length > 100) throw new HttpError(400, "Choose a valid delivery hub.");
    if (typeof body.deliverySlot !== "string" || body.deliverySlot.length > 80) throw new HttpError(400, "Choose a valid delivery slot.");
    if (!PAYMENT_METHODS.has(body.paymentMethod)) throw new HttpError(400, "Choose a valid payment method.");
    if (typeof body.paymentPhone !== "string" || !/^[+0-9 ()-]{8,24}$/.test(body.paymentPhone.trim())) {
      throw new HttpError(400, "Enter a valid payment phone number.");
    }
    if (typeof body.pooling !== "boolean") throw new HttpError(400, "Choose whether to join the buying pool.");
    const ids = [];
    const quantities = new Map();
    for (const item of body.items) {
      if (!item || typeof item.id !== "string" || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100) {
        throw new HttpError(400, "One or more cart items are invalid.");
      }
      quantities.set(item.id, (quantities.get(item.id) || 0) + item.qty);
      if (!ids.includes(item.id)) ids.push(item.id);
    }
    const placeholders = ids.map(() => "?").join(", ");
    const result = await execute(
      env,
      `SELECT id, swahili_name, english_name, category, price_tzs, weight_kg, unit, image_url, hub_availability, is_active FROM products WHERE id IN (${placeholders}) AND is_active = 1`,
      ids,
    );
    if (result.rows.length !== ids.length) throw new HttpError(409, "A product in your cart is no longer available.");
    const productsById = new Map(result.rows.map((row) => [row.id, row]));
    const savedSettings = await env.APP_KV?.get("settings:marketplace");
    const settings = savedSettings ? JSON.parse(savedSettings) : {};
    const fee = Number.isSafeInteger(settings.deliveryFeeTZS) ? settings.deliveryFeeTZS : 3000;
    const discountPercent = body.pooling && Number.isFinite(settings.poolingDiscountPercent)
      ? Math.min(50, Math.max(0, settings.poolingDiscountPercent))
      : 0;
    const lines = ids.map((id) => {
      const product = productsById.get(id);
      let availability = [];
      try {
        availability = JSON.parse(product.hub_availability);
      } catch {
        throw new HttpError(503, "A product is missing hub availability data.");
      }
      if (!availability.includes(body.hub)) throw new HttpError(409, "A product is not available at the selected hub.");
      const qty = quantities.get(id);
      return {
        id,
        swahiliName: product.swahili_name,
        englishName: product.english_name,
        priceTZS: Number(product.price_tzs),
        weightKg: Number(product.weight_kg),
        qty,
      };
    });
    const subtotal = lines.reduce((sum, item) => sum + item.priceTZS * item.qty, 0);
    const weight = lines.reduce((sum, item) => sum + item.weightKg * item.qty, 0);
    const total = subtotal + fee - Math.round(subtotal * discountPercent / 100);
    const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000);
    const { salt, hash, iterations } = await hashPassword(pin);
    const id = crypto.randomUUID();
    await execute(
      env,
      "INSERT INTO orders (id, user_id, items_json, total_tzs, weight_kg, status, payment_status, payment_method, payment_phone, hub, delivery_slot, pin_salt, pin_hash) VALUES (?, ?, ?, ?, ?, 'PENDING_PAYMENT', 'UNPAID', ?, ?, ?, ?, ?, ?)",
      [id, session.user.id, JSON.stringify(lines), total, weight, body.paymentMethod, body.paymentPhone.trim(), body.hub, body.deliverySlot, salt, `${iterations}:${hash}`],
    );
    return json({ order: { id, status: "PENDING_PAYMENT", paymentStatus: "UNPAID", totalTZS: total, deliveryPin: pin } }, 201);
  } catch (error) {
    return fail(error);
  }
}
