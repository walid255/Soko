import { destroySession, readSession } from "../../_lib/auth.js";
import { assertSameOrigin, fail } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request);
    await readSession(request, env, { requireCsrf: true });
    return await destroySession(request, env);
  } catch (error) {
    return fail(error);
  }
}
