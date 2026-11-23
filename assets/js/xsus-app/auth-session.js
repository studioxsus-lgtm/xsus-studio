const SUPABASE_URL = "https://rdcwqjsmzklktfccebfs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";
const ALLOWED_ORIGINS = new Set(["https://xsusstudio.com", "https://www.xsusstudio.com", "https://xsus-app-build-preview-staging.onrender.com"]);

let clientPromise;

/** Return the first-party XSUS Studio Supabase client only on explicitly allowed XSUS Studio origins. */
export function getSupabaseClient() {
  if (!ALLOWED_ORIGINS.has(window.location.origin)) {
    throw new Error("XSUS App authentication is available only on approved XSUS Studio sites.");
  }
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2").then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      })
    );
  }
  return clientPromise;
}

export async function getUserAccessToken() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error("Could not read the signed-in session.");
  const token = data?.session?.access_token;
  if (typeof token !== "string" || token.length < 20) return null;
  return token;
}
