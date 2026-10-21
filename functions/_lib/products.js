import { HttpError } from "./http.js";

export function validateProduct(body) {
  for (const field of ["swahiliName", "englishName", "category", "unit", "image"]) {
    if (typeof body[field] !== "string" || !body[field].trim() || body[field].length > 1024) {
      throw new HttpError(400, `Enter a valid ${field}.`);
    }
  }
  if (
    !/^\/api\/media\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(body.image) &&
    !/^https:\/\/images\.unsplash\.com\/[a-z0-9-]+(?:\?.*)?$/i.test(body.image)
  ) {
    throw new HttpError(400, "Use an uploaded image or a trusted HTTPS image URL.");
  }
  if (!Number.isSafeInteger(body.priceTZS) || body.priceTZS <= 0 || body.priceTZS > 100000000) {
    throw new HttpError(400, "Enter a valid product price.");
  }
  if (
    typeof body.weightKg !== "number" ||
    !Number.isFinite(body.weightKg) ||
    body.weightKg <= 0 ||
    body.weightKg > 100000
  ) {
    throw new HttpError(400, "Enter a valid product weight.");
  }
  if (
    !Array.isArray(body.hubAvailability) ||
    body.hubAvailability.length > 20 ||
    body.hubAvailability.some((hub) => typeof hub !== "string" || hub.length > 100)
  ) {
    throw new HttpError(400, "Choose valid product hubs.");
  }
  if (typeof body.isActive !== "boolean") {
    throw new HttpError(400, "Product active status is required.");
  }
}
