/**
 * XSUS AI Core — Response Quality Pipeline API
 * Version: 1.0.0
 *
 * API publike për ekzekutimin e pipeline-it të cilësisë.
 * Ruhet implementimi ekzistues dhe ekspozohet një ndërfaqe
 * e thjeshtë për modulet e tjera.
 */

import {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION
} from "./response-quality-pipeline.js";

export const RESPONSE_QUALITY_PIPELINE_API_VERSION = "1.0.0";

const defaultPipeline = createResponseQualityPipeline();

/**
 * Vlerëson përgjigjen dhe kthen raportin e cilësisë.
 *
 * @param {object} input
 * @returns {object}
 */
export function evaluateResponseQualityPipeline(input) {
  return defaultPipeline.evaluate(input);
}

/**
 * Krijon një instancë të pavarur të pipeline-it.
 *
 * @returns {{ evaluate: Function }}
 */
export function createResponseQualityPipelineAPI() {
  const pipeline = createResponseQualityPipeline();

  return Object.freeze({
    version: RESPONSE_QUALITY_PIPELINE_API_VERSION,
    pipelineVersion: RESPONSE_QUALITY_PIPELINE_VERSION,
    evaluate: (input) => pipeline.evaluate(input)
  });
}

/**
 * Jep informacion për versionet e API-së dhe pipeline-it.
 */
export function getResponseQualityPipelineInfo() {
  return Object.freeze({
    apiVersion: RESPONSE_QUALITY_PIPELINE_API_VERSION,
    pipelineVersion: RESPONSE_QUALITY_PIPELINE_VERSION
  });
}
