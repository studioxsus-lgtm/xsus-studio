import {createPostgresCancellationRecoveryStore} from "./postgres-cancellation-recovery-store.js";
import {createDurableCancellationRecovery} from "./durable-cancellation-recovery.js";
export const POSTGRES_RECOVERY_INTEGRATION_VERSION="0.1.0";
/** Composes the Phase 59 state machine with the Phase 60 PostgreSQL store. */
export function createPostgresRecoveryIntegration({query,authorizeReview}={}){
 if(typeof query!=="function"||typeof authorizeReview!=="function")throw new TypeError("Trusted database query and review authorization required");
 const store=createPostgresCancellationRecoveryStore({query});
 return createDurableCancellationRecovery({store,authorizeReview});
}
