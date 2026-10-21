import { requireUser } from "../../_lib/auth.js";
import { fail, HttpError, json, readJson, requireBinding } from "../../_lib/http.js";

const DEFAULT_SETTINGS = {
  deliveryFeeTZS: 3000,
  poolingDiscountPercent: 15,
  poolingTargetKg: 500,
  poolingCutoffHour: 21,
  defaultHub: "Kariakoo Hub",
};

export async function onRequestGet({ request, env }) {
  try {
    await requireUser(request, env, "admin");
    const kv = requireBinding(env.APP_KV, "Workers KV");
    const saved = await kv.get("settings:marketplace");
    return json({ settings: { ...DEFAULT_SETTINGS, ...(saved ? JSON.parse(saved) : {}) } });
  } catch (error) {
    return fail(error);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    await requireUser(request, env, "admin");
    const kv = requireBinding(env.APP_KV, "Workers KV");
    const settings = await readJson(request);
    const numeric = ["deliveryFeeTZS", "poolingDiscountPercent", "poolingTargetKg", "poolingCutoffHour"];
    for (const key of numeric) {
      if (!Number.isFinite(settings[key])) throw new HttpError(400, `Invalid setting: ${key}.`);
    }
    if (!Number.isInteger(settings.deliveryFeeTZS) || settings.deliveryFeeTZS < 0 || settings.deliveryFeeTZS > 1000000) throw new HttpError(400, "Delivery fee is out of range.");
    if (settings.poolingDiscountPercent < 0 || settings.poolingDiscountPercent > 50) throw new HttpError(400, "Pooling discount must be between 0 and 50 percent.");
    if (settings.poolingTargetKg <= 0 || settings.poolingTargetKg > 1000000) throw new HttpError(400, "Pooling target is out of range.");
    if (!Number.isInteger(settings.poolingCutoffHour) || settings.poolingCutoffHour < 0 || settings.poolingCutoffHour > 23) throw new HttpError(400, "Cutoff hour must be from 0 to 23.");
    if (typeof settings.defaultHub !== "string" || settings.defaultHub.length > 100) throw new HttpError(400, "Enter a valid default hub.");
    const clean = {
      deliveryFeeTZS: settings.deliveryFeeTZS,
      poolingDiscountPercent: settings.poolingDiscountPercent,
      poolingTargetKg: settings.poolingTargetKg,
      poolingCutoffHour: settings.poolingCutoffHour,
      defaultHub: settings.defaultHub,
    };
    await kv.put("settings:marketplace", JSON.stringify(clean));
    return json({ settings: clean });
  } catch (error) {
    return fail(error);
  }
}
