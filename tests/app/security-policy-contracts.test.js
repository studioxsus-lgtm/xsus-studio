
import { describe, it, expect } from "vitest";

import {
  SECURITY_POLICY_CONTRACTS_VERSION,
  SECURITY_POLICY_ACTIONS,
  SECURITY_POLICY_ERRORS,
  SECURITY_POLICY_DEFAULTS,
  validateSecurityPolicyConfig,
  validateSecurityPolicyRule,
  validateSecurityPolicy,
  validateSecurityPolicySubject,
  validateSecurityPolicyResource,
  validateSecurityPolicyEvaluationRequest,
  validateSecurityPolicyRequest,
} from "../../apps/app/security/policies/security-policy-contracts.js";

describe("Security Policy Contracts", () => {
  const validRule = {
    id: "rule-1",
    attribute: "department",
    operator: "equals",
    value: "engineering",
  };

  const validPolicy = {
    id: "policy-1",
    name: "Engineering access",
    effect: "allow",
    rules: [validRule],
    subjectTypes: ["user"],
    resourceTypes: ["app"],
    enabled: true,
  };

  const validSubject = {
    id: "user-1",
    type: "user",
  };

  const validResource = {
    id: "app-1",
    type: "app",
  };

  describe("version and constants", () => {
    it("exposes the expected contract version", () => {
      expect(SECURITY_POLICY_CONTRACTS_VERSION).toBe("1.0.0");
    });

    it("defines all supported actions", () => {
      expect(Object.values(SECURITY_POLICY_ACTIONS)).toEqual([
        "createPolicy",
        "getPolicy",
        "listPolicies",
        "updatePolicy",
        "deletePolicy",
        "enablePolicy",
        "disablePolicy",
        "evaluatePolicy",
        "getStatus",
      ]);
    });

    it("defines the required error codes", () => {
      expect(SECURITY_POLICY_ERRORS).toMatchObject({
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
    });

    it("defines secure default configuration", () => {
      expect(SECURITY_POLICY_DEFAULTS).toEqual({
        denyByDefault: true,
        requireExplicitEffect: true,
        allowPolicyOverride: false,
        allowDisabledPolicyEvaluation: false,
        maxPolicies: 1000,
        maxRulesPerPolicy: 100,
        maxHistory: 1000,
      });
    });

    it("freezes exported constants", () => {
      expect(Object.isFrozen(SECURITY_POLICY_ACTIONS)).toBe(true);
      expect(Object.isFrozen(SECURITY_POLICY_ERRORS)).toBe(true);
      expect(Object.isFrozen(SECURITY_POLICY_DEFAULTS)).toBe(true);
    });
  });

  describe("validateSecurityPolicyConfig", () => {
    it("returns default configuration", () => {
      expect(validateSecurityPolicyConfig()).toEqual(
        SECURITY_POLICY_DEFAULTS
      );
    });

    it("accepts valid custom configuration", () => {
      const config = validateSecurityPolicyConfig({
        maxPolicies: 500,
        maxRulesPerPolicy: 50,
        maxHistory: 200,
        denyByDefault: true,
        allowPolicyOverride: false,
      });

      expect(config.maxPolicies).toBe(500);
      expect(config.maxRulesPerPolicy).toBe(50);
      expect(config.maxHistory).toBe(200);
      expect(config.denyByDefault).toBe(true);
      expect(config.allowPolicyOverride).toBe(false);
    });

    it("freezes the normalized configuration", () => {
      const config = validateSecurityPolicyConfig();

      expect(Object.isFrozen(config)).toBe(true);
    });

    it("rejects null configuration", () => {
      expect(() => validateSecurityPolicyConfig(null))
        .toThrowError(/INVALID_CONFIG/);
    });

    it("rejects non-object configuration", () => {
      expect(() => validateSecurityPolicyConfig("invalid"))
        .toThrowError(/INVALID_CONFIG/);
    });

    it.each([
      "denyByDefault",
      "requireExplicitEffect",
      "allowPolicyOverride",
      "allowDisabledPolicyEvaluation",
    ])("rejects non-boolean option: %s", (key) => {
      expect(() =>
        validateSecurityPolicyConfig({
          [key]: "true",
        })
      ).toThrowError(/INVALID_CONFIG/);
    });

    it.each([
      "maxPolicies",
      "maxRulesPerPolicy",
      "maxHistory",
    ])("rejects invalid numeric option: %s", (key) => {
      for (const value of [0, -1, 1.5, NaN, Infinity, "10"]) {
        expect(() =>
          validateSecurityPolicyConfig({
            [key]: value,
          })
        ).toThrowError(/INVALID_CONFIG/);
      }
    });
  });

  describe("validateSecurityPolicyRule", () => {
    it("accepts a valid rule", () => {
      expect(validateSecurityPolicyRule(validRule)).toBe(true);
    });

    it("accepts exists operator without a value", () => {
      expect(
        validateSecurityPolicyRule({
          id: "rule-exists",
          attribute: "verified",
          operator: "exists",
        })
      ).toBe(true);
    });

    it("accepts notExists operator without a value", () => {
      expect(
        validateSecurityPolicyRule({
          id: "rule-not-exists",
          attribute: "verified",
          operator: "notExists",
        })
      ).toBe(true);
    });

    it("rejects non-object rules", () => {
      expect(() => validateSecurityPolicyRule(null))
        .toThrowError(/INVALID_RULE/);
    });

    it("rejects rules without an id", () => {
      expect(() =>
        validateSecurityPolicyRule({
          ...validRule,
          id: "",
        })
      ).toThrowError(/INVALID_RULE/);
    });

    it("rejects rules without an attribute", () => {
      expect(() =>
        validateSecurityPolicyRule({
          ...validRule,
          attribute: "",
        })
      ).toThrowError(/INVALID_RULE/);
    });

    it("rejects unsupported operators", () => {
      expect(() =>
        validateSecurityPolicyRule({
          ...validRule,
          operator: "execute",
        })
      ).toThrowError(/INVALID_RULE/);
    });

    it("rejects missing values for operators that require them", () => {
      const rule = {
        id: "rule-missing-value",
        attribute: "department",
        operator: "equals",
      };

      expect(() => validateSecurityPolicyRule(rule))
        .toThrowError(/INVALID_RULE/);
    });
  });

  describe("validateSecurityPolicy", () => {
    it("accepts a valid policy", () => {
      expect(validateSecurityPolicy(validPolicy)).toBe(true);
    });

    it("accepts a policy without optional subject and resource types", () => {
      const policy = {
        id: "policy-basic",
        name: "Basic policy",
        effect: "deny",
        rules: [validRule],
      };

      expect(validateSecurityPolicy(policy)).toBe(true);
    });

    it("accepts both allow and deny effects", () => {
      for (const effect of ["allow", "deny"]) {
        expect(
          validateSecurityPolicy({
            ...validPolicy,
            effect,
          })
        ).toBe(true);
      }
    });

    it("rejects non-object policies", () => {
      expect(() => validateSecurityPolicy(null))
        .toThrowError(/INVALID_POLICY/);
    });

    it("rejects missing policy id", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          id: "",
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("rejects missing policy name", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          name: "",
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("rejects invalid policy effect", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          effect: "permit",
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("rejects empty rules", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          rules: [],
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("rejects non-array rules", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          rules: validRule,
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("rejects invalid rules inside a policy", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          rules: [{ id: "invalid" }],
        })
      ).toThrowError(/INVALID_RULE/);
    });

    it("rejects unsupported subject types", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          subjectTypes: ["unknown"],
        })
      ).toThrowError(/INVALID_SUBJECT/);
    });

    it("rejects non-array subject types", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          subjectTypes: "user",
        })
      ).toThrowError(/INVALID_SUBJECT/);
    });

    it("rejects unsupported resource types", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          resourceTypes: ["unknown"],
        })
      ).toThrowError(/INVALID_RESOURCE/);
    });

    it("rejects non-array resource types", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          resourceTypes: "app",
        })
      ).toThrowError(/INVALID_RESOURCE/);
    });

    it("rejects non-boolean enabled values", () => {
      expect(() =>
        validateSecurityPolicy({
          ...validPolicy,
          enabled: "yes",
        })
      ).toThrowError(/INVALID_POLICY/);
    });
  });

  describe("validateSecurityPolicySubject", () => {
    it("accepts a valid user subject", () => {
      expect(validateSecurityPolicySubject(validSubject)).toBe(true);
    });

    it.each(["user", "role", "service", "system"])(
      "accepts subject type %s",
      (type) => {
        expect(
          validateSecurityPolicySubject({
            id: "subject-1",
            type,
          })
        ).toBe(true);
      }
    );

    it("rejects non-object subjects", () => {
      expect(() => validateSecurityPolicySubject(null))
        .toThrowError(/INVALID_SUBJECT/);
    });

    it("rejects missing subject id", () => {
      expect(() =>
        validateSecurityPolicySubject({
          type: "user",
        })
      ).toThrowError(/INVALID_SUBJECT/);
    });

    it("rejects unsupported subject types", () => {
      expect(() =>
        validateSecurityPolicySubject({
          id: "subject-1",
          type: "unknown",
        })
      ).toThrowError(/INVALID_SUBJECT/);
    });
  });

  describe("validateSecurityPolicyResource", () => {
    it("accepts a valid resource", () => {
      expect(validateSecurityPolicyResource(validResource)).toBe(true);
    });

    it.each([
      "app",
      "module",
      "api",
      "database",
      "file",
      "service",
      "custom",
    ])("accepts resource type %s", (type) => {
      expect(
        validateSecurityPolicyResource({
          id: "resource-1",
          type,
        })
      ).toBe(true);
    });

    it("rejects non-object resources", () => {
      expect(() => validateSecurityPolicyResource(null))
        .toThrowError(/INVALID_RESOURCE/);
    });

    it("rejects missing resource id", () => {
      expect(() =>
        validateSecurityPolicyResource({
          type: "app",
        })
      ).toThrowError(/INVALID_RESOURCE/);
    });

    it("rejects unsupported resource types", () => {
      expect(() =>
        validateSecurityPolicyResource({
          id: "resource-1",
          type: "unknown",
        })
      ).toThrowError(/INVALID_RESOURCE/);
    });
  });

  describe("validateSecurityPolicyEvaluationRequest", () => {
    it("accepts a valid evaluation request", () => {
      expect(
        validateSecurityPolicyEvaluationRequest({
          subject: validSubject,
          resource: validResource,
          action: "read",
          context: {
            environment: "test",
          },
        })
      ).toBe(true);
    });

    it("accepts an evaluation request without optional context", () => {
      expect(
        validateSecurityPolicyEvaluationRequest({
          subject: validSubject,
          resource: validResource,
          action: "read",
        })
      ).toBe(true);
    });

    it("rejects non-object requests", () => {
      expect(() =>
        validateSecurityPolicyEvaluationRequest(null)
      ).toThrowError(/INVALID_REQUEST/);
    });

    it("rejects missing subject", () => {
      expect(() =>
        validateSecurityPolicyEvaluationRequest({
          resource: validResource,
          action: "read",
        })
      ).toThrowError(/INVALID_SUBJECT/);
    });

    it("rejects missing resource", () => {
      expect(() =>
        validateSecurityPolicyEvaluationRequest({
          subject: validSubject,
          action: "read",
        })
      ).toThrowError(/INVALID_RESOURCE/);
    });

    it("rejects missing action", () => {
      expect(() =>
        validateSecurityPolicyEvaluationRequest({
          subject: validSubject,
          resource: validResource,
          action: "",
        })
      ).toThrowError(/INVALID_REQUEST/);
    });

    it("rejects non-object context", () => {
      expect(() =>
        validateSecurityPolicyEvaluationRequest({
          subject: validSubject,
          resource: validResource,
          action: "read",
          context: "invalid",
        })
      ).toThrowError(/INVALID_CONTEXT/);
    });
  });

  describe("validateSecurityPolicyRequest", () => {
    it("accepts createPolicy requests", () => {
      expect(
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.CREATE_POLICY,
          policy: validPolicy,
        })
      ).toBe(true);
    });

    it("accepts getPolicy requests", () => {
      expect(
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.GET_POLICY,
          id: "policy-1",
        })
      ).toBe(true);
    });

    it("accepts listPolicies requests", () => {
      expect(
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.LIST_POLICIES,
        })
      ).toBe(true);
    });

    it("accepts updatePolicy requests", () => {
      expect(
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.UPDATE_POLICY,
          id: "policy-1",
          policy: validPolicy,
        })
      ).toBe(true);
    });

    it.each([
      SECURITY_POLICY_ACTIONS.DELETE_POLICY,
      SECURITY_POLICY_ACTIONS.ENABLE_POLICY,
      SECURITY_POLICY_ACTIONS.DISABLE_POLICY,
    ])("accepts policy id action: %s", (action) => {
      expect(
        validateSecurityPolicyRequest({
          action,
          id: "policy-1",
        })
      ).toBe(true);
    });

    it("accepts evaluatePolicy requests", () => {
      expect(
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.EVALUATE_POLICY,
          subject: validSubject,
          resource: validResource,
          actionName: "read",
        })
      ).toBe(true);
    });

    it("accepts getStatus requests", () => {
      expect(
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.GET_STATUS,
        })
      ).toBe(true);
    });

    it("rejects non-object requests", () => {
      expect(() => validateSecurityPolicyRequest(null))
        .toThrowError(/INVALID_REQUEST/);
    });

    it("rejects missing action", () => {
      expect(() =>
        validateSecurityPolicyRequest({})
      ).toThrowError(/INVALID_ACTION/);
    });

    it("rejects unsupported actions", () => {
      expect(() =>
        validateSecurityPolicyRequest({
          action: "unknownAction",
        })
      ).toThrowError(/INVALID_ACTION/);
    });

    it("rejects createPolicy without a valid policy", () => {
      expect(() =>
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.CREATE_POLICY,
          policy: {},
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("rejects getPolicy without an id", () => {
      expect(() =>
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.GET_POLICY,
        })
      ).toThrowError(/INVALID_REQUEST/);
    });

    it("rejects updatePolicy without an id", () => {
      expect(() =>
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.UPDATE_POLICY,
          policy: validPolicy,
        })
      ).toThrowError(/INVALID_REQUEST/);
    });

    it("rejects updatePolicy without a valid policy", () => {
      expect(() =>
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.UPDATE_POLICY,
          id: "policy-1",
          policy: {},
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("rejects evaluatePolicy without a valid subject", () => {
      expect(() =>
        validateSecurityPolicyRequest({
          action: SECURITY_POLICY_ACTIONS.EVALUATE_POLICY,
          resource: validResource,
          actionName: "read",
        })
      ).toThrowError(/INVALID_SUBJECT/);
    });
  });
});
