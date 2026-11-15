import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createHyperEvidenceOwnerAuthorizer } from "./hyper-evidence-owner-authorizer.js";
import { createHyperTrustedEvidenceStorage } from "./hyper-v8223-trusted-evidence-storage.js";

describe("Hyper owner positive and negative evidence verification (isolated)", () => {
  it("allows the mapped owner, denies a different user and rejects tampering", async () => {
    const owner = randomUUID();
    const other = randomUUID();
    const observationId = "test_"+randomUUID().replaceAll("-","");
    const input = {
      observationId,serviceId:"xsus-studio",
      snapshot:{
        instanceId:randomUUID(),processId:1234,
        startedAt:"2026-11-15T12:00:00.000Z",
        observedAt:"2026-11-15T12:00:01.000Z",
        source:"local-process-observation"
      }
    };
    let saved;
    const storage = createHyperTrustedEvidenceStorage({
      key:Buffer.alloc(32,0x53),keyId:"integration-test",
      enabled:true,
      insertBundle:async bundle => {
        saved=bundle;
        return {inserted:true,observationId};
      },
      readBundle:async id => id===observationId?saved:null
    });
    expect((await storage.store(input)).stored).toBe(true);
    const fetchImpl=vi.fn(async (url,opts) => {
      expect(opts.method).toBe("GET");
      expect(url).toContain("hyper_evidence_owners");
      return {ok:true,json:async()=>[{user_id:owner,observation_id:observationId}]};
    });
    const authorize=createHyperEvidenceOwnerAuthorizer({
      url:"https://test-project.supabase.co",
      serviceRoleKey:"test-only-key",fetchImpl
    });
    expect(await authorize({userId:owner,observationId})).toBe(true);
    expect((await storage.readVerified(observationId)).verified).toBe(true);
    expect(await authorize({userId:other,observationId})).toBe(false);
    saved={...saved,row:{...saved.row,process_id:9999}};
    expect((await storage.readVerified(observationId)).verified).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
