import { execute } from "../_lib/db.js";
import { fail, json } from "../_lib/http.js";

function darEsSalaamDayBounds() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayStartUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), -3);
  const sqlTime = (date) => date.toISOString().slice(0, 19).replace("T", " ");
  return [sqlTime(new Date(dayStartUtc)), sqlTime(new Date(dayStartUtc + 86400000))];
}

export async function onRequestGet({ env }) {
  try {
    const [dayStart, nextDayStart] = darEsSalaamDayBounds();
    const [weightResult, activityResult] = await Promise.all([
      execute(
        env,
        "SELECT COALESCE(SUM(weight_kg), 0) AS current_kg FROM orders WHERE payment_status = 'PAID' AND status IN ('DISPATCHED', 'DELIVERED') AND created_at >= ? AND created_at < ?",
        [dayStart, nextDayStart],
      ),
      execute(
        env,
        "SELECT items_json, hub, created_at FROM orders WHERE payment_status = 'PAID' AND created_at >= ? AND created_at < ? ORDER BY created_at DESC LIMIT 5",
        [dayStart, nextDayStart],
      ),
    ]);
    const activity = activityResult.rows.map((row) => {
      let items = [];
      try {
        items = JSON.parse(row.items_json);
      } catch {
        console.error("Invalid items JSON in pooling activity");
      }
      return {
        item: items.map((item) => `${item.swahiliName} x${item.qty}`).join(", "),
        hub: row.hub,
        createdAt: new Date(row.created_at).toISOString(),
      };
    });
    return json({
      currentKg: Number(weightResult.rows[0]?.current_kg || 0),
      activity,
    }, 200, { "Cache-Control": "public, max-age=30" });
  } catch (error) {
    return fail(error);
  }
}
