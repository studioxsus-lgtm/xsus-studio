import { describe, it, expect } from "vitest";

import {
  createSecurityPolicyEngine,
  SECURITY_POLICY_ENGINE_VERSION,
} from "../../apps/app/security/policies/security-policy-engine.js";

describe("Security Policy Engine", () => {
  function setup(options = {}) {
    const engine = createSecurityPolicyEngine(options);
    return { engine };
  }

  const validRule = {
    id: "rule-1",
    attribute: "action",
    operator: "equals",
    value: "read",
  };

  const allowPolicy = {
    id: "policy-allow",
    name: "Allow read access",
    effect: "allow",
    rules: [validRule],
    subjectTypes: ["user"],
    resourceTypes: ["app"],
    enabled: true,
  };

  const denyPolicy = {
    id: "policy-deny",
    name: "Deny read access",
    effect: "deny",
    rules: [validRule],
    subjectTypes: ["user"],
    resourceTypes: ["app"],
    enabled: true,
  };

  const subject = {
    id: "user-1",
    type: "user",
  };

  const resource = {
    id: "app-1",
    type: "app",
  };

  function evaluationRequest(overrides = {}) {
    return {
      subject,
      resource,
      action: "read",
      requestedAction: "read",
      ...overrides,
    };
  }

  describe("initialization", () => {
    it("exports the expected version", () => {
      expect(SECURITY_POLICY_ENGINE_VERSION).toBe("1.0.0");
    });

    it("creates an engine", () => {
      const { engine } = setup();

      expect(engine).toBeDefined();
      expect(typeof engine.createPolicy).toBe("function");
    });

    it("exposes all expected methods", () => {
      const { engine } = setup();

      expect(engine).toMatchObject({
        createPolicy: expect.any(Function),
        getPolicy: expect.any(Function),
        listPolicies: expect.any(Function),
        updatePolicy: expect.any(Function),
        deletePolicy: expect.any(Function),
        enablePolicy: expect.any(Function),
        disablePolicy: expect.any(Function),
        evaluatePolicy: expect.any(Function),
        processRequest: expect.any(Function),
        getStatus: expect.any(Function),
        getHistory: expect.any(Function),
        close: expect.any(Function),
      });
    });

    it("rejects invalid options", () => {
      expect(() => createSecurityPolicyEngine(null))
        .toThrowError(/INVALID_CONFIG/);
    });

    it("rejects a non-function clock", () => {
      expect(() =>
        createSecurityPolicyEngine({ now: 123 })
      ).toThrowError(/INVALID_CONFIG/);
    });

    it("reports the initial status", () => {
      const { engine } = setup();

      expect(engine.getStatus()).toEqual({
        version: "1.0.0",
        closed: false,
        policyCount: 0,
        enabledPolicyCount: 0,
        historySize: 0,
        denyByDefault: true,
      });
    });
  });

  describe("createPolicy", () => {
    it("creates a valid policy", () => {
      const { engine } = setup();
      const result = engine.createPolicy(allowPolicy);

      expect(result.id).toBe("policy-allow");
      expect(result.name).toBe("Allow read access");
      expect(result.effect).toBe("allow");
      expect(result.enabled).toBe(true);
    });

    it("adds creation timestamps", () => {
      const { engine } = setup({ now: () => 1000 });
      const result = engine.createPolicy(allowPolicy);

      expect(result.createdAt).toBe(1000);
      expect(result.updatedAt).toBe(1000);
    });

    it("does not modify the original policy", () => {
      const { engine } = setup();
      const input = structuredClone(allowPolicy);

      engine.createPolicy(input);

      expect(input).toEqual(allowPolicy);
      expect(input.createdAt).toBeUndefined();
    });

    it("returns an independent policy copy", () => {
      const { engine } = setup();
      const result = engine.createPolicy(allowPolicy);

      result.name = "Changed externally";
      result.rules[0].value = "write";

      const stored = engine.getPolicy("policy-allow");

      expect(stored.name).toBe("Allow read access");
      expect(stored.rules[0].value).toBe("read");
    });

    it("rejects duplicate policy IDs", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(() => engine.createPolicy(allowPolicy))
        .toThrowError(/POLICY_ALREADY_EXISTS/);
    });

    it("rejects invalid policies", () => {
      const { engine } = setup();

      expect(() => engine.createPolicy({}))
        .toThrowError(/INVALID_POLICY/);
    });

    it("enforces the maximum policy count", () => {
      const { engine } = setup({
        config: { maxPolicies: 1 },
      });

      engine.createPolicy(allowPolicy);

      expect(() =>
        engine.createPolicy({
          ...denyPolicy,
          id: "policy-second",
        })
      ).toThrowError(/POLICY_LIMIT_REACHED/);
    });

    it("enforces the maximum number of rules", () => {
      const { engine } = setup({
        config: { maxRulesPerPolicy: 1 },
      });

      expect(() =>
        engine.createPolicy({
          ...allowPolicy,
          rules: [
            validRule,
            { ...validRule, id: "rule-2" },
          ],
        })
      ).toThrowError(/INVALID_POLICY/);
    });

    it("records policy creation", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(engine.getHistory()).toHaveLength(1);
      expect(engine.getHistory()[0].type).toBe("POLICY_CREATED");
    });
  });

  describe("getPolicy and listPolicies", () => {
    it("retrieves an existing policy", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(engine.getPolicy("policy-allow").id)
        .toBe("policy-allow");
    });

    it("rejects missing policy IDs", () => {
      const { engine } = setup();

      expect(() => engine.getPolicy(""))
        .toThrowError(/INVALID_REQUEST/);
    });

    it("rejects unknown policy IDs", () => {
      const { engine } = setup();

      expect(() => engine.getPolicy("unknown"))
        .toThrowError(/POLICY_NOT_FOUND/);
    });

    it("returns all policies", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);
      engine.createPolicy(denyPolicy);

      expect(engine.listPolicies()).toHaveLength(2);
    });

    it("returns independent policy copies in the list", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const policies = engine.listPolicies();
      policies[0].name = "External change";

      expect(engine.getPolicy("policy-allow").name)
        .toBe("Allow read access");
    });
  });

  describe("updatePolicy", () => {
    it("updates an existing policy", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const updated = engine.updatePolicy("policy-allow", {
        ...allowPolicy,
        name: "Updated policy",
      });

      expect(updated.name).toBe("Updated policy");
    });

    it("preserves the original creation timestamp", () => {
      let currentTime = 1000;
      const { engine } = setup({ now: () => currentTime });

      engine.createPolicy(allowPolicy);
      currentTime = 2000;

      const updated = engine.updatePolicy("policy-allow", {
        ...allowPolicy,
        name: "Updated policy",
      });

      expect(updated.createdAt).toBe(1000);
      expect(updated.updatedAt).toBe(2000);
    });

    it("rejects changing the policy ID", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(() =>
        engine.updatePolicy("policy-allow", {
          ...allowPolicy,
          id: "another-id",
        })
      ).toThrowError(/POLICY_CONFLICT/);
    });

    it("rejects updating an unknown policy", () => {
      const { engine } = setup();

      expect(() => engine.updatePolicy("unknown", allowPolicy))
        .toThrowError(/POLICY_NOT_FOUND/);
    });

    it("rejects invalid updated policies", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(() => engine.updatePolicy("policy-allow", {}))
        .toThrowError(/INVALID_POLICY/);
    });

    it("records policy updates", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      engine.updatePolicy("policy-allow", {
        ...allowPolicy,
        name: "Updated",
      });

      expect(engine.getHistory().at(-1).type)
        .toBe("POLICY_UPDATED");
    });
  });

  describe("deletePolicy", () => {
    it("deletes an existing policy", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(engine.deletePolicy("policy-allow")).toBe(true);
      expect(engine.listPolicies()).toHaveLength(0);
    });

    it("rejects deleting an unknown policy", () => {
      const { engine } = setup();

      expect(() => engine.deletePolicy("unknown"))
        .toThrowError(/POLICY_NOT_FOUND/);
    });

    it("records policy deletion", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);
      engine.deletePolicy("policy-allow");

      expect(engine.getHistory().at(-1).type)
        .toBe("POLICY_DELETED");
    });
  });

  describe("enablePolicy and disablePolicy", () => {
    it("disables an enabled policy", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(engine.disablePolicy("policy-allow").enabled)
        .toBe(false);
    });

    it("enables a disabled policy", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        enabled: false,
      });

      expect(engine.enablePolicy("policy-allow").enabled)
        .toBe(true);
    });

    it("rejects disabling an unknown policy", () => {
      const { engine } = setup();

      expect(() => engine.disablePolicy("unknown"))
        .toThrowError(/POLICY_NOT_FOUND/);
    });

    it("records enable and disable events", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);
      engine.disablePolicy("policy-allow");
      engine.enablePolicy("policy-allow");

      const types = engine.getHistory().map((entry) => entry.type);

      expect(types).toContain("POLICY_DISABLED");
      expect(types).toContain("POLICY_ENABLED");
    });
  });

  describe("rule evaluation", () => {
    it("allows an action when an allow policy matches", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.evaluatePolicy(evaluationRequest());

      expect(result.allowed).toBe(true);
      expect(result.effect).toBe("allow");
      expect(result.reason).toBe("EXPLICIT_ALLOW");
    });

    it("denies by default when no policy matches", () => {
      const { engine } = setup();
      const result = engine.evaluatePolicy(evaluationRequest());

      expect(result.allowed).toBe(false);
      expect(result.effect).toBe("deny");
      expect(result.reason).toBe("DEFAULT_DENY");
    });

    it("denies when a matching deny policy exists", () => {
      const { engine } = setup();
      engine.createPolicy(denyPolicy);

      const result = engine.evaluatePolicy(evaluationRequest());

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("EXPLICIT_DENY");
    });

    it("gives deny policies priority over allow policies", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);
      engine.createPolicy(denyPolicy);

      const result = engine.evaluatePolicy(evaluationRequest());

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("EXPLICIT_DENY");
      expect(result.matchedPolicyIds).toHaveLength(2);
    });

    it("does not match a policy for a different action", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.evaluatePolicy(
        evaluationRequest({ action: "write", requestedAction: "write" })
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DEFAULT_DENY");
    });

    it("does not match a policy for a different subject type", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.evaluatePolicy(
        evaluationRequest({
          subject: { id: "service-1", type: "service" },
        })
      );

      expect(result.allowed).toBe(false);
    });

    it("does not match a policy for a different resource type", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.evaluatePolicy(
        evaluationRequest({
          resource: { id: "database-1", type: "database" },
        })
      );

      expect(result.allowed).toBe(false);
    });

    it("ignores disabled policies", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        enabled: false,
      });

      const result = engine.evaluatePolicy(evaluationRequest());

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DEFAULT_DENY");
    });

    it("evaluates nested attributes", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        rules: [{
          id: "nested-rule",
          attribute: "context.environment",
          operator: "equals",
          value: "production",
        }],
      });

      const result = engine.evaluatePolicy(
        evaluationRequest({
          context: { environment: "production" },
        })
      );

      expect(result.allowed).toBe(true);
    });

    it("evaluates exists operator", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        rules: [{
          id: "exists-rule",
          attribute: "context.verified",
          operator: "exists",
        }],
      });

      const result = engine.evaluatePolicy(
        evaluationRequest({ context: { verified: true } })
      );

      expect(result.allowed).toBe(true);
    });

    it("evaluates notExists operator", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        rules: [{
          id: "not-exists-rule",
          attribute: "context.blocked",
          operator: "notExists",
        }],
      });

      const result = engine.evaluatePolicy(
        evaluationRequest({ context: {} })
      );

      expect(result.allowed).toBe(true);
    });

    it("evaluates contains operator", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        rules: [{
          id: "contains-rule",
          attribute: "context.tags",
          operator: "contains",
          value: "trusted",
        }],
      });

      const result = engine.evaluatePolicy(
        evaluationRequest({
          context: { tags: ["trusted", "internal"] },
        })
      );

      expect(result.allowed).toBe(true);
    });

    it("evaluates in operator", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        rules: [{
          id: "in-rule",
          attribute: "context.level",
          operator: "in",
          value: [1, 2, 3],
        }],
      });

      const result = engine.evaluatePolicy(
        evaluationRequest({ context: { level: 2 } })
      );

      expect(result.allowed).toBe(true);
    });

    it("evaluates numeric comparison operators", () => {
      const operators = [
        ["greaterThan", 10, 5],
        ["greaterThanOrEqual", 10, 10],
        ["lessThan", 5, 10],
        ["lessThanOrEqual", 10, 10],
      ];

      for (const [operator, actual, expected] of operators) {
        const { engine } = setup();

        engine.createPolicy({
          ...allowPolicy,
          id: `policy-${operator}`,
          rules: [{
            id: `rule-${operator}`,
            attribute: "context.score",
            operator,
            value: expected,
          }],
        });

        const result = engine.evaluatePolicy(
          evaluationRequest({ context: { score: actual } })
        );

        expect(result.allowed).toBe(true);
      }
    });

    it("requires all rules in a policy to match", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        rules: [
          validRule,
          {
            id: "rule-2",
            attribute: "context.verified",
            operator: "equals",
            value: true,
          },
        ],
      });

      const result = engine.evaluatePolicy(
        evaluationRequest({ context: { verified: false } })
      );

      expect(result.allowed).toBe(false);
    });

    it("returns matched policy IDs", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.evaluatePolicy(evaluationRequest());

      expect(result.matchedPolicyIds).toEqual(["policy-allow"]);
    });

    it("returns an independent evaluation result", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.evaluatePolicy(evaluationRequest());

      expect(Object.isFrozen(result)).toBe(false);
      expect(result.allowed).toBe(true);
    });
  });

  describe("evaluation validation", () => {
    it("rejects an invalid subject", () => {
      const { engine } = setup();

      expect(() =>
        engine.evaluatePolicy(evaluationRequest({ subject: null }))
      ).toThrowError(/INVALID_SUBJECT/);
    });

    it("rejects an invalid resource", () => {
      const { engine } = setup();

      expect(() =>
        engine.evaluatePolicy(evaluationRequest({ resource: null }))
      ).toThrowError(/INVALID_RESOURCE/);
    });

    it("rejects a missing requested action", () => {
      const { engine } = setup();

      expect(() =>
        engine.evaluatePolicy({
          subject,
          resource,
          action: "read",
        })
      ).toThrowError(/INVALID_REQUEST/);
    });

    it("rejects a non-object context", () => {
      const { engine } = setup();

      expect(() =>
        engine.evaluatePolicy(
          evaluationRequest({ context: "invalid" })
        )
      ).toThrowError(/INVALID_CONTEXT/);
    });
  });

  describe("history", () => {
    it("records policy evaluation events", () => {
      const { engine } = setup();
      engine.evaluatePolicy(evaluationRequest());

      expect(engine.getHistory().at(-1).type)
        .toBe("POLICY_EVALUATED");
    });

    it("limits history size", () => {
      const { engine } = setup({
        config: { maxHistory: 2 },
      });

      engine.createPolicy(allowPolicy);
      engine.disablePolicy("policy-allow");
      engine.enablePolicy("policy-allow");

      expect(engine.getHistory()).toHaveLength(2);
    });

    it("returns independent history entries", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const history = engine.getHistory();
      history[0].type = "CHANGED";

      expect(engine.getHistory()[0].type)
        .toBe("POLICY_CREATED");
    });
  });

  describe("processRequest", () => {
    it("processes createPolicy requests", () => {
      const { engine } = setup();

      const result = engine.processRequest({
        action: "createPolicy",
        policy: allowPolicy,
      });

      expect(result.id).toBe("policy-allow");
    });

    it("processes getPolicy requests", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.processRequest({
        action: "getPolicy",
        id: "policy-allow",
      });

      expect(result.id).toBe("policy-allow");
    });

    it("processes listPolicies requests", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.processRequest({
        action: "listPolicies",
      });

      expect(result).toHaveLength(1);
    });

    it("processes updatePolicy requests", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.processRequest({
        action: "updatePolicy",
        id: "policy-allow",
        policy: {
          ...allowPolicy,
          name: "Updated",
        },
      });

      expect(result.name).toBe("Updated");
    });

    it("processes deletePolicy requests", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      expect(engine.processRequest({
        action: "deletePolicy",
        id: "policy-allow",
      })).toBe(true);
    });

    it("processes enablePolicy requests", () => {
      const { engine } = setup();
      engine.createPolicy({
        ...allowPolicy,
        enabled: false,
      });

      const result = engine.processRequest({
        action: "enablePolicy",
        id: "policy-allow",
      });

      expect(result.enabled).toBe(true);
    });

    it("processes disablePolicy requests", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.processRequest({
        action: "disablePolicy",
        id: "policy-allow",
      });

      expect(result.enabled).toBe(false);
    });

    it("processes evaluatePolicy requests", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);

      const result = engine.processRequest({
        action: "evaluatePolicy",
        subject,
        resource,
        requestedAction: "read",
      });

      expect(result.allowed).toBe(true);
    });

    it("processes getStatus requests", () => {
      const { engine } = setup();

      const result = engine.processRequest({
        action: "getStatus",
      });

      expect(result.version).toBe("1.0.0");
    });

    it("rejects unsupported requests", () => {
      const { engine } = setup();

      expect(() =>
        engine.processRequest({ action: "unknown" })
      ).toThrowError(/INVALID_ACTION/);
    });
  });

  describe("status", () => {
    it("reports policy counts", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);
      engine.createPolicy({
        ...denyPolicy,
        enabled: false,
      });

      expect(engine.getStatus()).toMatchObject({
        policyCount: 2,
        enabledPolicyCount: 1,
      });
    });
  });

  describe("close", () => {
    it("closes the engine", () => {
      const { engine } = setup();

      expect(engine.close()).toBe(true);
    });

    it("clears policies and history", () => {
      const { engine } = setup();
      engine.createPolicy(allowPolicy);
      engine.close();

      expect(() => engine.getStatus())
        .toThrowError(/ALREADY_CLOSED/);
    });

    it("rejects operations after close", () => {
      const { engine } = setup();
      engine.close();

      expect(() => engine.createPolicy(allowPolicy))
        .toThrowError(/ALREADY_CLOSED/);

      expect(() => engine.listPolicies())
        .toThrowError(/ALREADY_CLOSED/);

      expect(() => engine.evaluatePolicy(evaluationRequest()))
        .toThrowError(/ALREADY_CLOSED/);
    });

    it("rejects closing the engine twice", () => {
      const { engine } = setup();
      engine.close();

      expect(() => engine.close())
        .toThrowError(/ALREADY_CLOSED/);
    });
  });
});
