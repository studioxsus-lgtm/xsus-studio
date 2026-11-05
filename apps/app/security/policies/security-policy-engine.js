
/**
 * XSUS App — Security Policy Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Menaxhimi i politikave të sigurisë.
 * - Vlerësimi i rregullave.
 * - Zbatimi i deny-by-default.
 * - Regjistrimi i historikut pa ruajtur sekrete.
 *
 * Storage: RAM-only.
 * Ky implementim nuk është ende production-ready.
 */

import {
  SECURITY_POLICY_ACTIONS,
  SECURITY_POLICY_ERRORS,
  validateSecurityPolicyConfig,
  validateSecurityPolicy,
  validateSecurityPolicyRequest,
  validateSecurityPolicyEvaluationRequest,
} from "./security-policy-contracts.js";

export const SECURITY_POLICY_ENGINE_VERSION = "1.0.0";

function createPolicyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

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

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (isPlainObject(value)) {
    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneValue(item);
    }

    return result;
  }

  return value;
}

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const item of Object.values(value)) {
    deepFreeze(item);
  }

  return value;
}

function normalizePolicy(policy, now) {
  const normalized = {
    ...cloneValue(policy),
    enabled: policy.enabled !== false,
    createdAt: policy.createdAt ?? now,
    updatedAt: now,
  };

  return deepFreeze(normalized);
}

function getAttributeValue(source, path) {
  const parts = path.split(".");
  let current = source;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      !Object.prototype.hasOwnProperty.call(
        Object(current),
        part
      )
    ) {
      return {
        exists: false,
        value: undefined,
      };
    }

    current = current[part];
  }

  return {
    exists: true,
    value: current,
  };
}

function compareValues(actual, operator, expected) {
  switch (operator) {
    case "equals":
      return Object.is(actual, expected);

    case "notEquals":
      return !Object.is(actual, expected);

    case "contains":
      if (typeof actual === "string") {
        return actual.includes(expected);
      }

      if (Array.isArray(actual)) {
        return actual.some((item) => Object.is(item, expected));
      }

      return false;

    case "notContains":
      if (typeof actual === "string") {
        return !actual.includes(expected);
      }

      if (Array.isArray(actual)) {
        return !actual.some((item) => Object.is(item, expected));
      }

      return false;

    case "in":
      return (
        Array.isArray(expected) &&
        expected.some((item) => Object.is(actual, item))
      );

    case "notIn":
      return (
        Array.isArray(expected) &&
        !expected.some((item) => Object.is(actual, item))
      );

    case "greaterThan":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );

    case "greaterThanOrEqual":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual >= expected
      );

    case "lessThan":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );

    case "lessThanOrEqual":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual <= expected
      );

    case "exists":
      return actual !== undefined;

    case "notExists":
      return actual === undefined;

    default:
      return false;
  }
}

function evaluateRule(rule, evaluationData) {
  const result = getAttributeValue(
    evaluationData,
    rule.attribute
  );

  if (rule.operator === "exists") {
    return result.exists;
  }

  if (rule.operator === "notExists") {
    return !result.exists;
  }

  if (!result.exists) {
    return false;
  }

  return compareValues(
    result.value,
    rule.operator,
    rule.value
  );
}

function policyMatchesScope(policy, subject, resource) {
  if (
    Array.isArray(policy.subjectTypes) &&
    !policy.subjectTypes.includes(subject.type)
  ) {
    return false;
  }

  if (
    Array.isArray(policy.resourceTypes) &&
    !policy.resourceTypes.includes(resource.type)
  ) {
    return false;
  }

  return true;
}

function evaluatePolicyRules(policy, evaluationData) {
  return policy.rules.every((rule) =>
    evaluateRule(rule, evaluationData)
  );
}

function sanitizePolicy(policy) {
  return {
    id: policy.id,
    name: policy.name,
    effect: policy.effect,
    enabled: policy.enabled,
    subjectTypes: cloneValue(policy.subjectTypes ?? []),
    resourceTypes: cloneValue(policy.resourceTypes ?? []),
    rules: cloneValue(policy.rules),
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

/**
 * Krijon një Security Policy Engine të pavarur.
 */
export function createSecurityPolicyEngine(options = {}) {
  if (!isPlainObject(options)) {
    throw createPolicyError(
      SECURITY_POLICY_ERRORS.INVALID_CONFIG,
      "INVALID_CONFIG: Options duhet të jetë objekt."
    );
  }

  const {
    now = Date.now,
    config: suppliedConfig = {},
  } = options;

  if (typeof now !== "function") {
    throw createPolicyError(
      SECURITY_POLICY_ERRORS.INVALID_CONFIG,
      "INVALID_CONFIG: now duhet të jetë funksion."
    );
  }

  const config = validateSecurityPolicyConfig(
    suppliedConfig
  );

  const policies = new Map();
  const history = [];

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.ALREADY_CLOSED,
        "ALREADY_CLOSED: Engine është mbyllur."
      );
    }
  }

  function record(event) {
    history.push(
      deepFreeze({
        ...cloneValue(event),
        timestamp: now(),
      })
    );

    while (history.length > config.maxHistory) {
      history.shift();
    }
  }

  function getStoredPolicy(id) {
    const policy = policies.get(id);

    if (!policy) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.POLICY_NOT_FOUND,
        "POLICY_NOT_FOUND: Politika nuk u gjet."
      );
    }

    return policy;
  }

  function createPolicy(policyInput) {
    assertOpen();
    validateSecurityPolicy(policyInput);

    if (policies.has(policyInput.id)) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.POLICY_ALREADY_EXISTS,
        "POLICY_ALREADY_EXISTS: Politika ekziston."
      );
    }

    if (policies.size >= config.maxPolicies) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.POLICY_LIMIT_REACHED,
        "POLICY_LIMIT_REACHED: Është arritur kufiri i politikave."
      );
    }

    if (policyInput.rules.length > config.maxRulesPerPolicy) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.INVALID_POLICY,
        "INVALID_POLICY: Është tejkaluar numri maksimal i rregullave."
      );
    }

    const policy = normalizePolicy(
      policyInput,
      now()
    );

    policies.set(policy.id, policy);

    record({
      type: "POLICY_CREATED",
      policyId: policy.id,
    });

    return cloneValue(policy);
  }

  function getPolicy(id) {
    assertOpen();

    if (typeof id !== "string" || !id.trim()) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.INVALID_REQUEST,
        "INVALID_REQUEST: id është i detyrueshëm."
      );
    }

    return cloneValue(getStoredPolicy(id));
  }

  function listPolicies() {
    assertOpen();

    return Array.from(policies.values()).map(
      (policy) => cloneValue(policy)
    );
  }

  function updatePolicy(id, policyInput) {
    assertOpen();

    if (typeof id !== "string" || !id.trim()) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.INVALID_REQUEST,
        "INVALID_REQUEST: id është i detyrueshëm."
      );
    }

    getStoredPolicy(id);
    validateSecurityPolicy(policyInput);

    if (policyInput.id !== id) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.POLICY_CONFLICT,
        "POLICY_CONFLICT: ID e politikës nuk mund të ndryshohet."
      );
    }

    if (policyInput.rules.length > config.maxRulesPerPolicy) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.INVALID_POLICY,
        "INVALID_POLICY: Është tejkaluar numri maksimal i rregullave."
      );
    }

    const previous = getStoredPolicy(id);

    const updated = normalizePolicy(
      {
        ...cloneValue(policyInput),
        createdAt: previous.createdAt,
      },
      now()
    );

    policies.set(id, updated);

    record({
      type: "POLICY_UPDATED",
      policyId: id,
    });

    return cloneValue(updated);
  }

  function deletePolicy(id) {
    assertOpen();

    const policy = getStoredPolicy(id);

    policies.delete(id);

    record({
      type: "POLICY_DELETED",
      policyId: policy.id,
    });

    return true;
  }

  function setPolicyEnabled(id, enabled) {
    assertOpen();

    if (typeof enabled !== "boolean") {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.INVALID_REQUEST,
        "INVALID_REQUEST: enabled duhet të jetë boolean."
      );
    }

    const policy = getStoredPolicy(id);

    const updated = normalizePolicy(
      {
        ...cloneValue(policy),
        enabled,
      },
      now()
    );

    policies.set(id, updated);

    record({
      type: enabled
        ? "POLICY_ENABLED"
        : "POLICY_DISABLED",
      policyId: id,
    });

    return cloneValue(updated);
  }

  function enablePolicy(id) {
    return setPolicyEnabled(id, true);
  }

  function disablePolicy(id) {
    return setPolicyEnabled(id, false);
  }

  function evaluatePolicy(request) {
    assertOpen();

    validateSecurityPolicyEvaluationRequest(request);

    const requestedAction = request.requestedAction;

    if (
      typeof requestedAction !== "string" ||
      !requestedAction.trim()
    ) {
      throw createPolicyError(
        SECURITY_POLICY_ERRORS.INVALID_REQUEST,
        "INVALID_REQUEST: requestedAction është i detyrueshëm."
      );
    }

    const evaluationData = {
      subject: cloneValue(request.subject),
      resource: cloneValue(request.resource),
      action: requestedAction,
      context: cloneValue(request.context ?? {}),
    };

    const applicablePolicies = [];

    for (const policy of policies.values()) {
      if (!policy.enabled) {
        continue;
      }

      if (
        !policyMatchesScope(
          policy,
          request.subject,
          request.resource
        )
      ) {
        continue;
      }

      if (evaluatePolicyRules(policy, evaluationData)) {
        applicablePolicies.push(policy);
      }
    }

    const denyPolicies = applicablePolicies.filter(
      (policy) => policy.effect === "deny"
    );

    const allowPolicies = applicablePolicies.filter(
      (policy) => policy.effect === "allow"
    );

    // Deny gjithmonë ka përparësi ndaj allow.
    const allowed =
      denyPolicies.length === 0 &&
      allowPolicies.length > 0;

    const result = deepFreeze({
      allowed,
      effect: allowed ? "allow" : "deny",
      reason: denyPolicies.length > 0
        ? "EXPLICIT_DENY"
        : allowPolicies.length > 0
          ? "EXPLICIT_ALLOW"
          : config.denyByDefault
            ? "DEFAULT_DENY"
            : "NO_MATCHING_POLICY",
      matchedPolicyIds: applicablePolicies.map(
        (policy) => policy.id
      ),
      evaluatedAt: now(),
    });

    record({
      type: "POLICY_EVALUATED",
      subjectId: request.subject.id,
      resourceId: request.resource.id,
      requestedAction,
      allowed: result.allowed,
      matchedPolicyIds: result.matchedPolicyIds,
    });

    return cloneValue(result);
  }

  function processRequest(request) {
    assertOpen();
    validateSecurityPolicyRequest(request);

    switch (request.action) {
      case SECURITY_POLICY_ACTIONS.CREATE_POLICY:
        return createPolicy(request.policy);

      case SECURITY_POLICY_ACTIONS.GET_POLICY:
        return getPolicy(request.id);

      case SECURITY_POLICY_ACTIONS.LIST_POLICIES:
        return listPolicies();

      case SECURITY_POLICY_ACTIONS.UPDATE_POLICY:
        return updatePolicy(request.id, request.policy);

      case SECURITY_POLICY_ACTIONS.DELETE_POLICY:
        return deletePolicy(request.id);

      case SECURITY_POLICY_ACTIONS.ENABLE_POLICY:
        return enablePolicy(request.id);

      case SECURITY_POLICY_ACTIONS.DISABLE_POLICY:
        return disablePolicy(request.id);

      case SECURITY_POLICY_ACTIONS.EVALUATE_POLICY:
        return evaluatePolicy(request);

      case SECURITY_POLICY_ACTIONS.GET_STATUS:
        return getStatus();

      default:
        throw createPolicyError(
          SECURITY_POLICY_ERRORS.INVALID_ACTION,
          "INVALID_ACTION: Veprimi nuk mbështetet."
        );
    }
  }

  function getStatus() {
    assertOpen();

    return deepFreeze({
      version: SECURITY_POLICY_ENGINE_VERSION,
      closed,
      policyCount: policies.size,
      enabledPolicyCount: Array.from(
        policies.values()
      ).filter((policy) => policy.enabled).length,
      historySize: history.length,
      denyByDefault: config.denyByDefault,
    });
  }

  function getHistory() {
    assertOpen();

    return history.map((entry) => cloneValue(entry));
  }

  function close() {
    assertOpen();

    policies.clear();
    history.length = 0;
    closed = true;

    return true;
  }

  return Object.freeze({
    createPolicy,
    getPolicy,
    listPolicies,
    updatePolicy,
    deletePolicy,
    enablePolicy,
    disablePolicy,
    evaluatePolicy,
    processRequest,
    getStatus,
    getHistory,
    close,
  });
}
