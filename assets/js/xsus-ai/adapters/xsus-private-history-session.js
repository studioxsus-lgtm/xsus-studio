
/**
 * XSUS AI V3 — Private History Session
 * Version: 1.0.0
 * Phase: 22.16.5.4
 *
 * Connects Supabase Auth with the
 * private chat-history read adapter.
 *
 * Security:
 * - Clears memory on identity changes.
 * - Rejects stale asynchronous results.
 * - Rechecks identity before hydration.
 * - Never stores chats in localStorage.
 * - Never uses service-role credentials.
 * - Does not modify database RLS.
 *
 * This is a read-only integration.
 */

import {
  supabase
} from "../../../../services/supabase-client.js";

import {
  loadMyConversations,
  loadMyMessages
} from "./xsus-chat-history-adapter.js";

export const PRIVATE_HISTORY_SESSION_VERSION =
  "1.0.0";

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

  let destroyed = false;
  let started = false;
  let generation = 0;
  let currentUserId = null;
  let subscription = null;

  function notify(status) {
    if (!destroyed) {
      onStatusChange({
        status,
        userId: currentUserId
      });
    }
  }

  function invalidate() {
    generation += 1;
    chatController.clearHistory();
  }

  async function verifiedUserId() {
    const { data, error } =
      await supabase.auth.getUser();

    if (error || !data?.user?.id) {
      return null;
    }

    return data.user.id;
  }

  async function refresh() {
    if (destroyed || !started) {
      return false;
    }

    const requestGeneration = ++generation;

    notify("loading");

    try {
      const userId =
        await verifiedUserId();

      if (
        destroyed ||
        requestGeneration !== generation
      ) {
        return false;
      }

      if (!userId) {
        currentUserId = null;
        chatController.clearHistory();
        notify("signed-out");
        return false;
      }

      if (currentUserId !== userId) {
        chatController.clearHistory();
        currentUserId = userId;
      }

      const conversations =
        await loadMyConversations();

      if (
        destroyed ||
        requestGeneration !== generation
      ) {
        return false;
      }

      const messagesByConversation = {};

      for (const conversation of conversations) {
        const messages =
          await loadMyMessages(conversation.id);

        if (
          destroyed ||
          requestGeneration !== generation
        ) {
          return false;
        }

        messagesByConversation[
          conversation.id
        ] = messages;
      }

      /*
       * Authentication may change while
       * the database requests are running.
       *
       * Verify identity again before
       * updating the chat controller.
       */

      const finalUserId =
        await verifiedUserId();

      if (
        destroyed ||
        requestGeneration !== generation
      ) {
        return false;
      }

      if (finalUserId !== userId) {
        currentUserId = null;
        invalidate();
        notify("identity-changed");
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

      notify("ready");
      return true;

    } catch (error) {
      if (
        destroyed ||
        requestGeneration !== generation
      ) {
        return false;
      }

      currentUserId = null;
      invalidate();

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

  function handleAuthChange(event, session) {
    if (destroyed || !started) {
      return;
    }

    /*
     * Token refresh does not necessarily
     * represent an account change.
     */
    if (event === "TOKEN_REFRESHED") {
      const tokenUserId =
        session?.user?.id ?? null;

      if (
        currentUserId &&
        tokenUserId &&
        tokenUserId !== currentUserId
      ) {
        currentUserId = null;
        invalidate();
        notify("identity-changed");
        void refresh();
      }

      return;
    }

    if (event === "SIGNED_OUT") {
      currentUserId = null;
      invalidate();
      notify("signed-out");
      return;
    }

    if (
      event === "SIGNED_IN" ||
      event === "INITIAL_SESSION" ||
      event === "USER_UPDATED"
    ) {
      const nextUserId =
        session?.user?.id ?? null;

      if (nextUserId !== currentUserId) {
        currentUserId = null;
        invalidate();
      }

      /*
       * Schedule outside the synchronous
       * auth callback to avoid awaiting
       * Supabase operations inside it.
       */
      queueMicrotask(() => {
        if (!destroyed && started) {
          void refresh();
        }
      });
    }
  }

  function start() {
    if (destroyed || started) {
      return false;
    }

    started = true;
    currentUserId = null;

    invalidate();

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
    currentUserId = null;

    generation += 1;

    subscription?.unsubscribe();
    subscription = null;

    chatController.clearHistory();

    notify("stopped");
    return true;
  }

  function destroy() {
    if (destroyed) {
      return;
    }

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
