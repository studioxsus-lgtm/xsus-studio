/**
 * XSUS AI V3 — Private Idempotent Write Service
 * Phase 22.16.5.8.13 — opt-in integration; not wired into production UI.
 * Keeps legacy saveMyUserMessage({conversationId, content}) unchanged.
 * Requires database operation_id unique index and authenticated Supabase RLS.
 */
import { createPrivateWriteCoordinator, createWriteOperationId } from "./xsus-private-write-coordinator.js";
import { createSupabaseIdempotentWriteAdapter } from "./xsus-supabase-idempotent-write-adapter.js";

export const PRIVATE_IDEMPOTENT_WRITE_SERVICE_VERSION = "1.0.0";

export function createPrivateIdempotentWriteService({ supabase, maxCompleted = 500 } = {}) {
  if (!supabase || typeof supabase.auth?.getSession !== "function" ||
      typeof supabase.auth?.getUser !== "function") {
    throw new TypeError("An authenticated Supabase client is required.");
  }
  const bridge = createSupabaseIdempotentWriteAdapter({ supabase });
  async function getUserId() {
    const session = await supabase.auth.getSession();
    if (session.error || !session.data?.session) return null;
    const user = await supabase.auth.getUser();
    if (user.error || !user.data?.user?.id) return null;
    return user.data.user.id;
  }
  const coordinator = createPrivateWriteCoordinator({
    getUserId,
    maxCompleted,
    write: ({ operationId, conversationId, content }) =>
      bridge.save({ operationId, conversationId, content })
  });
  return Object.freeze({
    createOperationId: createWriteOperationId,
    save({ operationId, conversationId, content } = {}) {
      // Callers must retain operationId across retries. Never regenerate it here.
      return coordinator.execute({ operationId, conversationId, content });
    },
    invalidate() { return coordinator.invalidate(); },
    destroy() { return coordinator.destroy(); },
    getPendingCount() { return coordinator.getPendingCount(); },
    getCompletedCount() { return coordinator.getCompletedCount(); },
    isDestroyed() { return coordinator.isDestroyed(); }
  });
}
