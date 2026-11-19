import { createXsusCoreClient } from "./xsus-core-client.js";
import { mountLearningPanel } from "./learning-panel.js";

const SUPABASE_URL = "https://rdcwqjsmzklktfccebfs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";
const CORE_API_URL = "https://future-xsus-core-api.onrender.com";

const notice = document.querySelector("#learning-auth-notice");
const loginLink = document.querySelector("#learning-login-link");
const panelRoot = document.querySelector("#learning-panel-root");
let mountedPanel = null;
let authSubscription = null;

function showSignedOut() {
  mountedPanel?.destroy();
  mountedPanel = null;
  panelRoot.hidden = true;
  notice.textContent = "Sign in to XSUS Studio to manage your private English-learning feedback.";
  loginLink.hidden = false;
}

function showSignedIn(core) {
  notice.textContent = "Your learning examples and review decisions are private to your account.";
  loginLink.hidden = true;
  panelRoot.hidden = false;
  mountedPanel?.destroy();
  mountedPanel = mountLearningPanel(panelRoot, { client: core });
}

async function start() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  const core = createXsusCoreClient({
    baseUrl: CORE_API_URL,
    getAccessToken: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data?.session?.access_token ?? null;
    },
  });

  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user?.id) showSignedOut();
  else showSignedIn(core);

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) showSignedIn(core);
    else showSignedOut();
  });
  authSubscription = listener?.subscription ?? null;
}

void start().catch(() => {
  notice.textContent = "Account connection is unavailable. Please sign in again later.";
  loginLink.hidden = false;
});

window.addEventListener("pagehide", () => {
  mountedPanel?.destroy();
  authSubscription?.unsubscribe?.();
}, { once: true });
