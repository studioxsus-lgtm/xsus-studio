import { getSupabaseClient } from "./auth-session.js";
/** XSUS Studio authentication status adapter. UI-only; not an authorization gate. */
const STUDIO_ORIGIN = "https://www.xsusstudio.com";
const STAGING_ORIGIN = "https://xsus-app-build-preview-staging.onrender.com";
if(window.location.origin===STAGING_ORIGIN){
 document.querySelectorAll("[data-xsus-auth] a[href]").forEach(link=>{
  const url=new URL(link.href);
  if(url.origin===STUDIO_ORIGIN&&url.pathname==="/auth.html")link.href=STAGING_ORIGIN+url.pathname+url.search;
 });
}
const labels = {
  en: { signedOut: "", signedIn: "Signed in", unavailable: "Account status unavailable" },
  sq: { signedOut: "", signedIn: "I identifikuar", unavailable: "Gjendja e llogarisë nuk u verifikua" },
  fr: { signedOut: "", signedIn: "Connecté", unavailable: "État du compte indisponible" }
};
function lang() {
  const value = document.documentElement.lang?.slice(0, 2);
  return labels[value] ? value : "en";
}
function render(user, error = false) {
  document.querySelectorAll("[data-xsus-auth]").forEach(container => {
    const login = container.querySelector("[data-auth-login]");
    const signup = container.querySelector("[data-auth-signup]");
    const account = container.querySelector("[data-auth-account]");
    const status = container.querySelector("[data-auth-status]");
    const authenticated = Boolean(user?.id);
    login?.classList.toggle("hidden", authenticated);
    signup?.classList.toggle("hidden", authenticated);
    account?.classList.toggle("hidden", !authenticated);
    if (status) status.textContent = error ? labels[lang()].unavailable : authenticated ? labels[lang()].signedIn : labels[lang()].signedOut;
  });
}
// A locally opened ZIP does not share browser storage with the hosted Studio.
// Only check the actual account when XSUS App is served on the same origin.
if (window.location.origin === STUDIO_ORIGIN || window.location.origin === "https://xsusstudio.com" || window.location.origin === STAGING_ORIGIN) {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    render(error ? null : data?.user, Boolean(error));
    supabase.auth.onAuthStateChange((_event, session) => render(session?.user ?? null));
  } catch (error) {
    console.warn("XSUS Studio account status unavailable", error);
    render(null, true);
  }
} else {
  render(null);
}
