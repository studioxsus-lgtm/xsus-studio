import { describe, expect, it } from "vitest";
import { assessHyperAtomicSecurity as assess } from "./hyper-v8228-atomic-security-gate.js";
const deny = { select:false, insert:false, update:false, delete:false, truncate:false };
const full = () => ({
  tableExists:true, rlsEnabled:true, forceRls:true,
  roles:{ anon:{...deny}, authenticated:{...deny} },
  triggers:{ updateDelete:true, truncate:true },
  serverRoleReviewed:true, keyCustodyReviewed:true
});
describe("Hyper v8.2.28 atomic security gate", () => {
  it("blocks missing evidence", () => expect(assess().verified).toBe(false));
  it("requires FORCE RLS", () => {
    const r=full();r.forceRls=false;
    expect(assess(r).blockers).toContain("BUNDLE_FORCE_RLS_MISSING");
  });
  it("rejects client grants", () => {
    const r=full();r.roles.authenticated.select=true;
    expect(assess(r).blockers).toContain("CLIENT_PRIVILEGES_NOT_DENIED");
  });
  it("requires both append-only triggers", () => {
    const r=full();r.triggers.truncate=false;
    expect(assess(r).blockers).toContain("APPEND_ONLY_TRIGGER_NOT_VERIFIED");
  });
  it("requires reviewed server role", () => {
    const r=full();r.serverRoleReviewed=false;
    expect(assess(r).blockers).toContain("SERVER_ROLE_NOT_REVIEWED");
  });
  it("does not grant production approval even with all findings", () => {
    const r=assess(full());
    expect(r.verified).toBe(false);
    expect(r.productionEligible).toBe(false);
    expect(r.blockers).toContain("AUTHENTICATED_LIVE_ATTESTATION_MISSING");
  });
});
