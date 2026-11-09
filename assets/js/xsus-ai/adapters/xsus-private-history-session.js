
/**
 * XSUS AI V3 — Private History Session
 * Version: 1.1.0
 * Phase: 22.16.5.4.3
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Verify Supabase identity.
 * - Load private conversations and messages.
 * - Prevent cross-account memory exposure.
 * - Reject stale asynchronous results.
 * - Avoid duplicate same-user hydration.
 * - Protect local changes during loading.
 * - Clean up authentication subscriptions.
 *
 * Security:
 * - No service-role credentials.
 * - No browser chat persistence.
 * - No database writes.
 * - No direct AI Core dependencies.
 *
 * Database authorization remains enforced
 * independently by Supabase RLS.
 */

import {
  supabase
} from "../../../../services/supabase-client.js";

import {
  loadMyConversations,
  loadMyMessages
} from "./xsus-chat-history-adapter.js";

export const PRIVATE_HISTORY_SESSION_VERSION =
  "1.1.0";

export function createPrivateHistorySession({
  chatController,
  onError = () => {},
  onStatusChange = () => {}
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
    typeof onStatusChange !== "function"
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
  let loadingUserId = null;

  let subscription = null;

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

  function isCurrent(requestGeneration) {
    return (
      !destroyed &&
      started &&
      generation === requestGeneration
    );
  }

  /* ==========================================
     MEMORY ISOLATION
  ========================================== */

  function clearPrivateMemory() {
    generation += 1;

    loadedUserId = null;
    loadingUserId = null;

    chatController.clearHistory();
  }

  function changeIdentity(nextUserId) {
    if (currentUserId === nextUserId) {
      return false;
    }

    clearPrivateMemory();

    currentUserId = nextUserId;

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
     LOCAL STATE PROTECTION
  ========================================== */

  function snapshotLocalState() {
    if (
      typeof chatController.getConversations !==
      "function"
    ) {
      return null;
    }

    const conversations =
      chatController.getConversations();

    const messages =
      typeof chatController.getMessages ===
      "function"
        ? chatController.getMessages()
        : null;

    return JSON.stringify({
      conversations,
      messages
    });
  }

  function localStateChanged(snapshot) {
    if (snapshot === null) {
      return false;
    }

    return snapshotLocalState() !== snapshot;
  }

  /* ==========================================
     PRIVATE HISTORY LOADING
  ========================================== */

  async function refresh({
    force = false
  } = {}) {
    if (destroyed || !started) {
      return false;
    }

    /*
     * A normal refresh must not replace
     * already loaded local conversations.
     */
    if (
      !force &&
      currentUserId &&
      loadedUserId === currentUserId
    ) {
      notify("ready");
      return true;
    }

    /*
     * Avoid duplicate simultaneous loads
     * for the same verified identity.
     */
    if (
      !force &&
      currentUserId &&
      loadingUserId === currentUserId
    ) {
      return false;
    }

    const requestGeneration =
      ++generation;

    notify("loading");

    try {
      const userId =
        await verifiedUserId();

      if (!isCurrent(requestGeneration)) {
        return false;
      }

      if (!userId) {
        changeIdentity(null);
        clearPrivateMemory();
        notify("signed-out");
        return false;
      }

      changeIdentity(userId);

      /*
       * changeIdentity() invalidates the
       * previous generation. Capture the
       * current generation for this load.
       */
      const loadGeneration = generation;

      if (
        !force &&
        loadedUserId === userId
      ) {
        notify("ready");
        return true;
      }

      loadingUserId = userId;

      const localSnapshot =
        snapshotLocalState();

      const conversations =
        await loadMyConversations();

      if (!isCurrent(loadGeneration)) {
        return false;
      }

      const messagesByConversation = {};

      for (const conversation of conversations) {
        const messages =
          await loadMyMessages(
            conversation.id
          );

        if (!isCurrent(loadGeneration)) {
          return false;
        }

        messagesByConversation[
          conversation.id
        ] = messages;
      }

      /*
       * Verify the identity again before
       * importing any private data.
       */
      const finalUserId =
        await verifiedUserId();

      if (!isCurrent(loadGeneration)) {
        return false;
      }

      if (finalUserId !== userId) {
        changeIdentity(null);
        clearPrivateMemory();

        notify("identity-changed");
        return false;
      }

      /*
       * A local conversation may have
       * changed while Supabase was loading.
       * Do not overwrite that work.
       */
      if (localStateChanged(localSnapshot)) {
        loadingUserId = null;
        notify("local-changes");
        return false;
      }

      const hydrated =
        chatController.hydrateHistory({
          conversations,
          messagesByConversation
        });

      if (!hydrated) {
        loadingUserId = null;
        notify("busy");
        return false;
      }

      loadedUserId = userId;
      loadingUserId = null;

      notify("ready");
      return true;

    } catch (error) {
      if (!isCurrent(requestGeneration) &&
          loadingUserId === null) {
        return false;
      }

      /*
       * Never keep a partially trusted
       * history after a load failure.
       */
      changeIdentity(null);
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
     AUTH EVENTS
  ========================================== */

  function handleAuthChange(event, session) {
    if (destroyed || !started) {
      return;
    }

    const nextUserId =
      session?.user?.id ?? null;

    if (event === "SIGNED_OUT") {
      changeIdentity(null);
      clearPrivateMemory();
      notify("signed-out");
      return;
    }

    if (event === "TOKEN_REFRESHED") {
      if (
        currentUserId &&
        nextUserId &&
        currentUserId !== nextUserId
      ) {
        changeIdentity(nextUserId);

        queueMicrotask(() => {
          if (started && !destroyed) {
            void refresh();
          }
        });
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
     * Repeated SIGNED_IN events for the
     * same loaded user must not rehydrate
     * or overwrite local conversations.
     */
    if (
      nextUserId &&
      nextUserId === currentUserId &&
      loadedUserId === nextUserId
    ) {
      return;
    }

    /*
     * If the same user's history is already
     * loading, avoid starting another load.
     */
    if (
      nextUserId &&
      nextUserId === currentUserId &&
      loadingUserId === nextUserId
    ) {
      return;
    }

    if (nextUserId !== currentUserId) {
      changeIdentity(nextUserId);
    }

    queueMicrotask(() => {
      if (started && !destroyed) {
        void refresh();
      }
    });
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
    loadingUserId = null;

    clearPrivateMemory();

    const { data } =
      supabase.auth.onAuthStateChange(
        handleAuthChange
      );

    subscription =
      data?.subscription ?? null;

    void refresh();

    return true;
  }

  function stop() {
    if (destroyed) {
      return false;
    }

    started = false;

    generation += 1;

    currentUserId = null;
    loadedUserId = null;
    loadingUserId = null;

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
