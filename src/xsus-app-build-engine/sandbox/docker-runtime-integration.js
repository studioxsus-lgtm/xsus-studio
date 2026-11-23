import {createDockerContainerDriver} from "./docker-container-driver.js";
import {createIsolatedExecutor} from "./isolated-executor.js";
import {createControlledExecutionCancellation} from "./controlled-execution-cancellation.js";
export const DOCKER_RUNTIME_INTEGRATION_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
/**
 * Connects existing isolated Docker execution and controlled cancellation.
 * All host effects are injected; nothing is launched without a trusted driver.
 */
export function createDockerRuntimeIntegration({image,verifyHostIsolation,runProcess,materialize,removeMaterialized,requestStop,recordUncertain,schedule,cancel}={}){
 const driver=createDockerContainerDriver({runProcess,materialize,removeMaterialized});
 const executor=createIsolatedExecutor({driver,image,verifyHostIsolation});
 const cancellation=createControlledExecutionCancellation({requestStop,recordUncertain,schedule,cancel});
 return Object.freeze({
  async execute({executionId,operationId,manifest,policy,signal,timeoutMs}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof operationId!=="string"||!ID.test(operationId))throw new TypeError("Invalid Docker runtime execution identity");
   return cancellation.execute({
    executionId,operationId,signal,timeoutMs,
    run:({signal:runSignal})=>executor.runIsolated({executionId,manifest,policy,signal:runSignal})
   });
  }
 });
}
