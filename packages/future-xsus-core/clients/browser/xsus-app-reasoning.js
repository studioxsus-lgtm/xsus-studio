import { createXsusCoreClient, XsusCoreApiError } from "./xsus-core-client.js";

export function createAppReasoning({ supabase, enabled = false, fetchImpl = globalThis.fetch }) {
  if (typeof enabled !== "boolean") throw new TypeError("Explicit feature flag required");
  if (typeof supabase?.auth?.getSession !== "function") throw new TypeError("Supabase client required");
  let busy = false;
  async function session() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user?.id || !data.session.access_token)
      throw new XsusCoreApiError(401, "unauthorized", "Sign in to use XSUS Core");
    return data.session;
  }
  return Object.freeze({
    async reason(input) {
      if (!enabled) throw new XsusCoreApiError(404, "disabled", "Reasoning is disabled");
      if (busy) throw new XsusCoreApiError(409, "busy", "A reasoning request is already active");
      busy = true;
      try {
        const initial = await session();
        const client = createXsusCoreClient({
          baseUrl: "https://future-xsus-core-api.onrender.com",
          getAccessToken: async () => initial.access_token,
          fetchImpl
        });
        const result = await client.reason(input);
        const current = await session();
        if (current.user.id !== initial.user.id)
          throw new XsusCoreApiError(401, "identity_changed", "Session identity changed");
        return result;
      } finally {
        busy = false;
      }
    }
  });
}
