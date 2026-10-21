import { requireUser } from "../../../_lib/auth.js";
import { execute } from "../../../_lib/db.js";
import { fail, HttpError, json, requireBinding } from "../../../_lib/http.js";

export async function onRequestDelete({ request, env, params }) {
  try {
    await requireUser(request, env, "admin");
    const key = params.key;
    if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(key)) {
      throw new HttpError(400, "Invalid image key.");
    }
    const used = await execute(
      env,
      "SELECT id FROM products WHERE image_url = ? LIMIT 1",
      [`/api/media/${key}`],
    );
    if (used.rows.length) throw new HttpError(409, "This image is used by a product.");
    const bucket = requireBinding(env.MEDIA_BUCKET, "R2 media bucket");
    await bucket.delete(key);
    return json({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
