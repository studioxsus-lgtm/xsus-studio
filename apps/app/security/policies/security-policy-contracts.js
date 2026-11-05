
/**
 * XSUS App — Security Policy Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Përcaktimi i kontratës së Security Policy Engine.
 * - Validimi i konfigurimit dhe kërkesave.
 * - Standardizimi i veprimeve dhe gabimeve.
 * - Zbatimi i parimit deny-by-default.
 *
 * Ky modul përcakton kontratën; nuk ekzekuton vetë
 * politikat dhe nuk merr vendime autorizimi.
 */

export const SECURITY_POLICY_CONTRACTS_VERSION = "1.0.0";

export const SECURITY_POLICY_ACTIONS = Object.freeze({
  CREATE_POLICY: "createPolicy",
  GET_POLICY: "getPolicy",
  LIST_POLICIES: "listPolicies",
  UPDATE_POLICY: "updatePolicy",
  DELETE_POLICY: "deletePolicy",
  ENABLE_POLICY: "enablePolicy",
  DISABLE_POLICY: "disablePolicy",
  EVALUATE_POLICY: "evaluatePolicy",
  GET_STATUS: "getStatus",
});

export const SECURITY_POLICY_ERRORS = Object.freeze({
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_POLICY: "INVALID_POLICY",
  POLICY_NOT_FOUND: "POLICY_NOT_FOUND",
  POLICY_ALREADY_EXISTS: "POLICY_ALREADY_EXISTS",
  POLICY_DISABLED: "POLICY_DISABLED",
  POLICY_CONFLICT: "POLICY_CONFLICT",
  INVALID_RULE: "INVALID_RULE",
  INVALID_SUBJECT: "INVALID_SUBJECT",
  INVALID_RESOURCE: "INVALID_RESOURCE",
  INVALID_CONTEXT: "INVALID_CONTEXT",
  ACCESS_DENIED: "ACCESS_DENIED",
  POLICY_EVALUATION_FAILED: "POLICY_EVALUATION_FAILED",
  POLICY_LIMIT_REACHED: "POLICY_LIMIT_REACHED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  ALREADY_CLOSED: "ALREADY_CLOSED",
});

export const SECURITY_POLICY_DEFAULTS = Object.freeze({
  denyByDefault: true,
  requireExplicitEffect: true,
  allowPolicyOverride: false,
  allowDisabledPolicyEvaluation: false,
  maxPolicies: 1000,
  maxRulesPerPolicy: 100,
  maxHistory: 1000,
});

const VALID_EFFECTS = Object.freeze(["allow", "deny"]);

const VALID_SUBJECT_TYPES = Object.freeze([
  "user",
  "role",
  "service",
  "system",
]);

const VALID_RESOURCE_TYPES = Object.freeze([
  "app",
  "module",
  "api",
  "database",
  "file",
  "service",
  "custom",
]);

const VALID_OPERATORS = Object.freeze([
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "in",
  "notIn",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "exists",
  "notExists",
]);

const VALID_ACTIONS = new Set(
  Object.values(SECURITY_POLICY_ACTIONS)
);

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function isPositiveSafeInteger(value) {
  return (
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function createContractError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Validon konfigurimin e Security Policy Engine.
 */
export function validateSecurityPolicyConfig(config = {}) {
  if (!isPlainObject(config)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_CONFIG,
      "INVALID_CONFIG: Konfigurimi duhet të jetë objekt."
    );
  }

  const normalized = {
    ...SECURITY_POLICY_DEFAULTS,
    ...config,
  };

  const booleanOptions = [
    "denyByDefault",
    "requireExplicitEffect",
    "allowPolicyOverride",
    "allowDisabledPolicyEvaluation",
  ];

  for (const key of booleanOptions) {
    if (typeof normalized[key] !== "boolean") {
      throw createContractError(
        SECURITY_POLICY_ERRORS.INVALID_CONFIG,
        `INVALID_CONFIG: ${key} duhet të jetë boolean.`
      );
    }
  }

  const numericOptions = [
    "maxPolicies",
    "maxRulesPerPolicy",
    "maxHistory",
  ];

  for (const key of numericOptions) {
    if (!isPositiveSafeInteger(normalized[key])) {
      throw createContractError(
        SECURITY_POLICY_ERRORS.INVALID_CONFIG,
        `INVALID_CONFIG: ${key} duhet të jetë numër i plotë pozitiv.`
      );
    }
  }

  return Object.freeze(normalized);
}

/**
 * Validon një rregull individual të politikës.
 */
export function validateSecurityPolicyRule(rule) {
  if (!isPlainObject(rule)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RULE,
      "INVALID_RULE: Rregulli duhet të jetë objekt."
    );
  }

  if (!isNonEmptyString(rule.id)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RULE,
      "INVALID_RULE: Rregulli duhet të ketë id."
    );
  }

  if (!isNonEmptyString(rule.attribute)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RULE,
      "INVALID_RULE: attribute është i detyrueshëm."
    );
  }

  if (!VALID_OPERATORS.includes(rule.operator)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RULE,
      "INVALID_RULE: operator nuk mbështetet."
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(rule, "value") &&
    !["exists", "notExists"].includes(rule.operator)
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RULE,
      "INVALID_RULE: value është i detyrueshëm për këtë operator."
    );
  }

  return true;
}

/**
 * Validon strukturën e një politike.
 */
export function validateSecurityPolicy(policy) {
  if (!isPlainObject(policy)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_POLICY,
      "INVALID_POLICY: Politika duhet të jetë objekt."
    );
  }

  if (!isNonEmptyString(policy.id)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_POLICY,
      "INVALID_POLICY: id është i detyrueshëm."
    );
  }

  if (!isNonEmptyString(policy.name)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_POLICY,
      "INVALID_POLICY: name është i detyrueshëm."
    );
  }

  if (
    !VALID_EFFECTS.includes(policy.effect)
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_POLICY,
      "INVALID_POLICY: effect duhet të jetë allow ose deny."
    );
  }

  if (
    !Array.isArray(policy.rules) ||
    policy.rules.length === 0
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_POLICY,
      "INVALID_POLICY: Duhet të ekzistojë të paktën një rregull."
    );
  }

  for (const rule of policy.rules) {
    validateSecurityPolicyRule(rule);
  }

  if (
    policy.subjectTypes !== undefined &&
    (
      !Array.isArray(policy.subjectTypes) ||
      policy.subjectTypes.some(
        (type) => !VALID_SUBJECT_TYPES.includes(type)
      )
    )
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_SUBJECT,
      "INVALID_SUBJECT: subjectTypes përmban vlera të pavlefshme."
    );
  }

  if (
    policy.resourceTypes !== undefined &&
    (
      !Array.isArray(policy.resourceTypes) ||
      policy.resourceTypes.some(
        (type) => !VALID_RESOURCE_TYPES.includes(type)
      )
    )
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RESOURCE,
      "INVALID_RESOURCE: resourceTypes përmban vlera të pavlefshme."
    );
  }

  if (
    policy.enabled !== undefined &&
    typeof policy.enabled !== "boolean"
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_POLICY,
      "INVALID_POLICY: enabled duhet të jetë boolean."
    );
  }

  return true;
}

/**
 * Validon identitetin e subjektit që po vlerësohet.
 */
export function validateSecurityPolicySubject(subject) {
  if (!isPlainObject(subject)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_SUBJECT,
      "INVALID_SUBJECT: Subject duhet të jetë objekt."
    );
  }

  if (!isNonEmptyString(subject.id)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_SUBJECT,
      "INVALID_SUBJECT: Subject duhet të ketë id."
    );
  }

  if (!VALID_SUBJECT_TYPES.includes(subject.type)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_SUBJECT,
      "INVALID_SUBJECT: Lloji i subjektit nuk mbështetet."
    );
  }

  return true;
}

/**
 * Validon burimin mbi të cilin kërkohet veprimi.
 */
export function validateSecurityPolicyResource(resource) {
  if (!isPlainObject(resource)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RESOURCE,
      "INVALID_RESOURCE: Resource duhet të jetë objekt."
    );
  }

  if (!isNonEmptyString(resource.id)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RESOURCE,
      "INVALID_RESOURCE: Resource duhet të ketë id."
    );
  }

  if (!VALID_RESOURCE_TYPES.includes(resource.type)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_RESOURCE,
      "INVALID_RESOURCE: Lloji i resource nuk mbështetet."
    );
  }

  return true;
}

/**
 * Validon kërkesën për vlerësimin e politikave.
 */
export function validateSecurityPolicyEvaluationRequest(request) {
  if (!isPlainObject(request)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_REQUEST,
      "INVALID_REQUEST: Kërkesa duhet të jetë objekt."
    );
  }

  validateSecurityPolicySubject(request.subject);
  validateSecurityPolicyResource(request.resource);

  if (!isNonEmptyString(request.action)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_REQUEST,
      "INVALID_REQUEST: action është i detyrueshëm."
    );
  }

  if (
    request.context !== undefined &&
    !isPlainObject(request.context)
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_CONTEXT,
      "INVALID_CONTEXT: context duhet të jetë objekt."
    );
  }

  return true;
}

/**
 * Validon kërkesat sipas veprimit.
 */
export function validateSecurityPolicyRequest(request) {
  if (!isPlainObject(request)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_REQUEST,
      "INVALID_REQUEST: Kërkesa duhet të jetë objekt."
    );
  }

  if (!isNonEmptyString(request.action)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_ACTION,
      "INVALID_ACTION: action është i detyrueshëm."
    );
  }

  if (!VALID_ACTIONS.has(request.action)) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_ACTION,
      `INVALID_ACTION: ${request.action} nuk mbështetet.`
    );
  }

  if (
    request.action === SECURITY_POLICY_ACTIONS.CREATE_POLICY
  ) {
    validateSecurityPolicy(request.policy);
  }

  if (
    request.action === SECURITY_POLICY_ACTIONS.UPDATE_POLICY
  ) {
    if (!isNonEmptyString(request.id)) {
      throw createContractError(
        SECURITY_POLICY_ERRORS.INVALID_REQUEST,
        "INVALID_REQUEST: id është i detyrueshëm."
      );
    }

    validateSecurityPolicy(request.policy);
  }

  if (
    [
      SECURITY_POLICY_ACTIONS.GET_POLICY,
      SECURITY_POLICY_ACTIONS.DELETE_POLICY,
      SECURITY_POLICY_ACTIONS.ENABLE_POLICY,
      SECURITY_POLICY_ACTIONS.DISABLE_POLICY,
    ].includes(request.action) &&
    !isNonEmptyString(request.id)
  ) {
    throw createContractError(
      SECURITY_POLICY_ERRORS.INVALID_REQUEST,
      "INVALID_REQUEST: id është i detyrueshëm."
    );
  }

  if (
    request.action === SECURITY_POLICY_ACTIONS.EVALUATE_POLICY
  ) {
    validateSecurityPolicyEvaluationRequest(request);
  }

  return true;
}
