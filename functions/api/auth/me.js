import { readSession } from "../../_lib/auth.js";
import { fail, json } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const session = await readSession(request, env);
    return json({
      user: session?.user || null,
      csrfToken: session?.csrfToken || null,
    });
  } catch (error) {
    return fail(error);
  }
}
