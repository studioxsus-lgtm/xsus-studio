
import { describe, it, expect } from "vitest";

import * as Security from "../../apps/app/security/index.js";

describe("XSUS App Security Module", () => {
  it("exports Authentication Manager", () => {
    expect(Security.createAuthenticationManager).toBeTypeOf("function");
  });

  it("exports Authorization Manager", () => {
    expect(Security.createAuthorizationManager).toBeTypeOf("function");
  });

  it("exports RBAC Engine", () => {
    expect(Security.createRBACEngine).toBeTypeOf("function");
  });

  it("exports Permission Engine", () => {
    expect(Security.createPermissionEngine).toBeTypeOf("function");
  });

  it("exports Session Manager", () => {
    expect(Security.createSessionManager).toBeTypeOf("function");
  });

  it("exports Security Policy Engine", () => {
    expect(Security.createSecurityPolicyEngine).toBeTypeOf("function");
  });

  it("exports Security Audit Engine", () => {
    expect(Security.createSecurityAuditEngine).toBeTypeOf("function");
  });

  it("exports all engine and manager versions", () => {
    expect(Security.AUTHENTICATION_MANAGER_VERSION).toBe("1.0.0");
    expect(Security.AUTHORIZATION_MANAGER_VERSION).toBe("1.0.0");
    expect(Security.RBAC_ENGINE_VERSION).toBe("1.0.0");
    expect(Security.PERMISSION_ENGINE_VERSION).toBe("1.0.0");
    expect(Security.SESSION_MANAGER_VERSION).toBe("1.0.0");
    expect(Security.SECURITY_POLICY_ENGINE_VERSION).toBe("1.0.0");
    expect(Security.SECURITY_AUDIT_ENGINE_VERSION).toBe("1.0.0");
  });
});
