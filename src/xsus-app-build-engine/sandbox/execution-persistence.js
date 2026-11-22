import {createPostgresExecutionStore} from "./postgres-execution-store.js";
import {createDurableExecutionRegistry} from "./durable-execution-registry.js";
export const EXECUTION_PERSISTENCE_VERSION="0.1.0";
/**
 * Backend-only composition. The injected query must use a real PostgreSQL
 * connection with atomic statements and a restricted database role.
 */
export function createExecutionPersistence({query,clock}={}){
  const store=createPostgresExecutionStore({query});
  const registry=createDurableExecutionRegistry({store,clock});
  return Object.freeze({store,registry});
}
