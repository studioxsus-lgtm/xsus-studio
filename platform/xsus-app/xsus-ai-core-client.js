/**
 * XSUS App → independent XSUS AI Core transport.
 * No direct imports from either Core. Supabase auth is verified before and
 * after the request; backend MUST independently validate JWT and ownership.
 */
export function createXsusAppAiCoreAdapter({
  supabase,
  fetchImpl = globalThis.fetch,
  endpoint = "https://xsus-studio.onrender.com/api/chat",
  getLanguage = () => "en"
} = {}) {
  if (!supabase?.auth?.getUser || !supabase?.auth?.getSession)
    throw new TypeError("Supabase auth client is required.");
  if (typeof fetchImpl !== "function") throw new TypeError("Fetch is required.");
  if (endpoint !== "https://xsus-studio.onrender.com/api/chat")
    throw new TypeError("Unapproved XSUS AI Core endpoint.");

  return async function requestAiCore({ message, conversationId, attachments = [], signal } = {}) {
    if (typeof message !== "string" || !message.trim())
      throw new TypeError("Message cannot be empty.");
    if (typeof conversationId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId))
      throw new TypeError("Valid conversation ID is required.");
    if (!Array.isArray(attachments) || attachments.length)
      throw new TypeError("Attachments are not supported.");
    const language = getLanguage();
    if (!["sq", "en", "fr"].includes(language))
      throw new TypeError("Unsupported language.");

    const { data: identity, error: identityError } = await supabase.auth.getUser();
    const userId = identity?.user?.id;
    if (identityError || !userId) throw new Error("Authentication required.");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (sessionError || !session?.access_token || session.user?.id !== userId)
      throw new Error("Authentication session mismatch.");

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ query: message.trim(), language, conversationId }),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal
    });
    if (!response?.ok) throw new Error("XSUS AI Core request failed.");
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || payload.error ||
        typeof payload.answer !== "string")
      throw new Error("Invalid XSUS AI Core response.");

    const { data: finalIdentity, error: finalError } = await supabase.auth.getUser();
    if (finalError || finalIdentity?.user?.id !== userId)
      throw new Error("Account changed during AI request.");
    return {
      answer: payload.answer,
      source: payload.source ?? null,
      confidence: payload.confidence ?? null,
      metadata: payload.metadata ?? {},
      requestId: payload.requestId ?? null
    };
  };
}
