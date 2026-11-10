
/**
 * XSUS AI V3 — Private History Session
 * Version: 1.2.0
 * Phase: 22.16.5.4.4
 * Brand: THE X IDENTITY
 *
 * Read-only Supabase history integration.
 *
 * Guarantees:
 * - Account changes invalidate old requests.
 * - Stale failures cannot clear new sessions.
 * - Concurrent refresh calls share one load.
 * - Repeated auth events avoid rehydration.
 * - Local changes prevent stale hydration.
 * - No browser history persistence.
 * - No database writes.
 *
 * Database access remains protected by RLS.
 */

import {
  supabase
} from "../../../../services/supabase-client.js";

import {
  loadMyConversations,
  loadMyMessages
} from "./xsus-chat-history-adapter.js";

export const PRIVATE_HISTORY_SESSION_VERSION =
  "1.2.0";

export function createPrivateHistorySession({
  chatController,
  onError = () => {},
  onStatusChange = () => {},
  onHydrated = () => {}
} = {}) {

  if (
    !chatController ||
    typeof chatController.clearHistory !== "function" ||
    typeof chatController.hydrateHistory !== "function"
  ) {
    throw new TypeError(
      "A compatible Chat Controller is required."
    );
  }

  if (
    typeof onError !== "function" ||
    typeof onStatusChange !== "function" ||
    typeof onHydrated !== "function"
  ) {
    throw new TypeError(
      "Invalid session callbacks."
    );
  }

  let destroyed = false;
  let started = false;

  let generation = 0;

  let currentUserId = null;
  let loadedUserId = null;

  let activeLoad = null;
  let subscription = null;
  let authSubscriptionEpoch = 0;

  /* ==========================================
     STATUS
  ========================================== */

  function notify(status) {
    if (destroyed) return;

    onStatusChange({
      status,
      userId: currentUserId
    });
  }

  function isCurrent(token) {
    return (
      started &&
      !destroyed &&
      generation === token
    );
  }

  /* ==========================================
     INVALIDATION
  ========================================== */

  function invalidate() {
    generation += 1;

    activeLoad = null;
    loadedUserId = null;
  }

  function clearPrivateMemory() {
    invalidate();

    chatController.clearHistory();
  }

  function changeIdentity(nextUserId) {
    if (currentUserId === nextUserId) {
      return false;
    }

    currentUserId = nextUserId;

    clearPrivateMemory();

    // Notify immediately: private writes and pending replies must be
    // invalidated before the next account's history begins loading.
    notify("identity-changed");

    return true;
  }

  /* ==========================================
     AUTHENTICATION
  ========================================== */

  async function verifiedUserId() {
    const { data, error } =
      await supabase.auth.getUser();

    if (error || !data?.user?.id) {
      return null;
    }

    return data.user.id;
  }

  /* ==========================================
     LOCAL STATE SNAPSHOT
  ========================================== */

  function snapshotLocalState() {
    if (
      typeof chatController.getConversations !==
      "function"
    ) {
      return null;
    }

    return JSON.stringify({
      conversations:
        chatController.getConversations(),

      messages:
        typeof chatController.getMessages ===
        "function"
          ? chatController.getMessages()
          : null
    });
  }

  function localStateChanged(snapshot) {
    if (snapshot === null) {
      return false;
    }

    return snapshotLocalState() !== snapshot;
  }

  /* ==========================================
     HISTORY LOADER
  ========================================== */

  async function loadHistory(token) {
    let localSnapshot = null;
    try {
      const userId =
        await verifiedUserId();

      if (!isCurrent(token)) {
        return false;
      }

      if (!userId) {
        changeIdentity(null);
        clearPrivateMemory();

        notify("signed-out");
        return false;
      }

      /*
       * A verified identity change clears
       * the previous account's memory.
       *
       * The current request continues with
       * the newly assigned generation.
       */
      if (currentUserId !== userId) {
        changeIdentity(userId);
        token = generation;
      }

      localSnapshot =
        snapshotLocalState();

      const conversations =
        await loadMyConversations();

      if (!isCurrent(token)) {
        return false;
      }

      if (!Array.isArray(conversations)) {
        throw new TypeError(
          "Invalid private conversations."
        );
      }

      const messagesByConversation = {};

      for (const conversation of conversations) {
        if (!isCurrent(token)) {
          return false;
        }

        const messages =
          await loadMyMessages(
            conversation.id
          );

        if (!isCurrent(token)) {
          return false;
        }

        if (!Array.isArray(messages)) {
          throw new TypeError(
            "Invalid private messages."
          );
        }

        messagesByConversation[
          conversation.id
        ] = messages;
      }

      /*
       * Confirm the same authenticated user
       * before exposing loaded messages.
       */
      const finalUserId =
        await verifiedUserId();

      if (!isCurrent(token)) {
        return false;
      }

      if (finalUserId !== userId) {
        changeIdentity(null);
        clearPrivateMemory();

        notify("identity-changed");
        return false;
      }

      /*
       * Do not replace conversations changed
       * locally while requests were pending.
       */
      if (localStateChanged(localSnapshot)) {
        notify("local-changes");
        return false;
      }

      const hydrated =
        chatController.hydrateHistory({
          conversations,
          messagesByConversation
        });

      if (!hydrated) {
        notify("busy");
        return false;
      }

      loadedUserId = userId;

      onHydrated({ userId, conversationIds: conversations.map(item => item.id) });
      notify("ready");

      return true;

    } catch (error) {

      /*
       * Critical isolation rule:
       *
       * An old rejected request must never
       * modify the active account's memory.
       */
      if (!isCurrent(token)) {
        return false;
      }

      // A failed network refresh must not erase edits made locally
      // while that same-account request was pending.
      if (localSnapshot !== null && localStateChanged(localSnapshot)) {
        notify("local-changes");
        onError(error instanceof Error ? error : new Error("Private history loading failed."));
        return false;
      }

      clearPrivateMemory();

      notify("error");

      onError(
        error instanceof Error
          ? error
          : new Error(
              "Private history loading failed."
            )
      );

      return false;
    }
  }

  /* ==========================================
     REFRESH COORDINATION
  ========================================== */

  function refresh({
    force = false
  } = {}) {

    if (destroyed || !started) {
      return Promise.resolve(false);
    }

    /*
     * Normal refresh preserves already
     * hydrated conversations.
     */
    if (
      !force &&
      currentUserId &&
      loadedUserId === currentUserId
    ) {
      notify("ready");
      return Promise.resolve(true);
    }

    /*
     * Concurrent callers share the same
     * pending operation.
     */
    if (!force && activeLoad) {
      return activeLoad.promise;
    }

    /*
     * Forced refresh explicitly supersedes
     * the previous request.
     */
    if (force) {
      invalidate();
    }

    const token = ++generation;

    notify("loading");

    const load = {
      token,
      promise: null
    };

    activeLoad = load;

    const promise = loadHistory(token);

    load.promise = promise;

    /*
     * Clean up only the operation that
     * still owns the active-load slot.
     */
    void promise.finally(() => {
      if (activeLoad === load) {
        activeLoad = null;
      }
    });

    return promise;
  }

  /* ==========================================
     AUTH EVENTS
  ========================================== */

  function scheduleRefresh() {
    const scheduledGeneration = generation;

    queueMicrotask(() => {
      if (
        isCurrent(scheduledGeneration)
      ) {
        void refresh();
      }
    });
  }

  function handleAuthChange(event, session) {
    if (!started || destroyed) {
      return;
    }

    const nextUserId =
      session?.user?.id ?? null;

    if (event === "SIGNED_OUT") {
      currentUserId = null;
      clearPrivateMemory();

      notify("signed-out");
      return;
    }

    if (event === "TOKEN_REFRESHED") {
      // A refreshed JWT must invalidate any in-flight request carrying
      // the previous token, even when the account ID stays unchanged.
      notify("token-refreshed");
      // A pending history request may have started under the previous JWT.
      // Discard its result and revalidate under the refreshed session.
      if (activeLoad) {
        invalidate();
        scheduleRefresh();
      }
      if (
        nextUserId &&
        currentUserId &&
        nextUserId !== currentUserId
      ) {
        changeIdentity(nextUserId);
        scheduleRefresh();
      }

      return;
    }

    if (
      event !== "SIGNED_IN" &&
      event !== "INITIAL_SESSION" &&
      event !== "USER_UPDATED"
    ) {
      return;
    }

    /*
     * A repeated event for an already
     * loaded account must not rehydrate.
     */
    if (
      nextUserId &&
      nextUserId === currentUserId &&
      loadedUserId === nextUserId
    ) {
      return;
    }

    /*
     * New identity: invalidate the old
     * request before starting another.
     */
    if (nextUserId !== currentUserId) {
      changeIdentity(nextUserId);
    }

    scheduleRefresh();
  }

  /* ==========================================
     LIFECYCLE
  ========================================== */

  function start() {
    if (destroyed || started) {
      return false;
    }

    started = true;

    currentUserId = null;
    loadedUserId = null;

    clearPrivateMemory();

    const subscriptionEpoch = ++authSubscriptionEpoch;

    try {
      const { data } =
        supabase.auth.onAuthStateChange(
          (event, session) => {
            if (subscriptionEpoch !== authSubscriptionEpoch) {
              return;
            }
            handleAuthChange(event, session);
          }
        );

      subscription =
        data?.subscription ?? null;

      void refresh();

      return true;

    } catch (error) {
      started = false;

      invalidate();

      subscription = null;

      throw error;
    }
  }

  function stop() {
    if (destroyed) {
      return false;
    }

    started = false;
    authSubscriptionEpoch += 1;

    currentUserId = null;

    invalidate();

    subscription?.unsubscribe();
    subscription = null;

    chatController.clearHistory();

    notify("stopped");

    return true;
  }

  function destroy() {
    if (destroyed) return;

    stop();

    destroyed = true;
  }

  return Object.freeze({
    start,
    stop,
    refresh,
    destroy,

    getCurrentUserId() {
      return currentUserId;
    },

    isStarted() {
      return started;
    }
  });
}
