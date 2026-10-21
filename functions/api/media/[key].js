import { fail, HttpError, requireBinding } from "../../_lib/http.js";

export async function onRequestGet({ env, params }) {
  try {
    const key = params.key;
    if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(key)) {
      throw new HttpError(404, "Image not found.");
    }
    const bucket = requireBinding(env.MEDIA_BUCKET, "R2 media bucket");
    const object = await bucket.get(key);
    if (!object) throw new HttpError(404, "Image not found.");
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    return fail(error);
  }
}
