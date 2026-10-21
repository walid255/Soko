import { requireUser } from "../../_lib/auth.js";
import { execute } from "../../_lib/db.js";
import { fail, HttpError, json, requireBinding } from "../../_lib/http.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function onRequestGet({ request, env }) {
  try {
    await requireUser(request, env, "admin");
    const bucket = requireBinding(env.MEDIA_BUCKET, "R2 media bucket");
    const listed = await bucket.list({ limit: 1000 });
    return json({
      assets: listed.objects.map((object) => ({
        key: object.key,
        url: `/api/media/${object.key}`,
        size: object.size,
        uploaded: object.uploaded.toISOString(),
      })),
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : null,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const session = await requireUser(request, env);
    if (!["admin", "vendor"].includes(session.user.role)) {
      throw new HttpError(403, "Only vendors and admins can upload product images.");
    }
    const bucket = requireBinding(env.MEDIA_BUCKET, "R2 media bucket");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose an image file.");
    const extension = IMAGE_TYPES.get(file.type);
    if (!extension) throw new HttpError(400, "Only JPEG, PNG, and WebP images are supported.");
    if (file.size < 1 || file.size > MAX_FILE_SIZE) {
      throw new HttpError(413, "Image must be smaller than 5 MB.");
    }
    const key = `${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { originalName: file.name.slice(0, 120) },
    });
    return json({ key, url: `/api/media/${key}` }, 201);
  } catch (error) {
    return fail(error);
  }
}
