import { fail, json, requireBinding } from "../_lib/http.js";

const DEFAULT_SETTINGS = {
  deliveryFeeTZS: 3000,
  poolingDiscountPercent: 15,
  poolingTargetKg: 500,
  poolingCutoffHour: 21,
  defaultHub: "Kariakoo Hub",
};

export async function onRequestGet({ env }) {
  try {
    const kv = requireBinding(env.APP_KV, "Workers KV");
    const saved = await kv.get("settings:marketplace");
    return json(
      { settings: { ...DEFAULT_SETTINGS, ...(saved ? JSON.parse(saved) : {}) } },
      200,
      { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    );
  } catch (error) {
    return fail(error);
  }
}
