import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createXsusAppHyperGateway } from "../../platform/xsus-app/xsus-hyper-gateway.js";
import { verifyXsusHyperEvidence } from "../../platform/xsus-app/xsus-hyper-evidence-client.js";

describe("XSUS App live Hyper verification gateway wiring", () => {
  it("uses the Hyper gateway in the existing live UI without a legacy AI Core fallback", () => {
    const source = readFileSync(
      new URL("../../assets/js/xsus-app/hyper-evidence-live.js", import.meta.url),
      "utf8"
    );
    expect(source).toContain('import("../../../platform/xsus-app/xsus-hyper-gateway.js")');
    expect(source).toContain("createXsusAppHyperGateway({verifyEvidence:verifyXsusHyperEvidence})");
    expect(source).toContain('hyperGateway.execute("evidence.verify",{');
    expect(source).not.toContain("createXSUSCoreAdapter");
    expect(source).not.toContain("xsus-ai-core-client");
  });

  it("preserves the authenticated Hyper evidence transport request contract", async () => {
    const fetchImpl = async (url, options) => {
      expect(url).toBe("https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify");
      expect(options.headers.Authorization).toBe("Bearer test_access_token_123456789");
      expect(JSON.parse(options.body)).toEqual({
        action: "evidence.verify",
        observationId: "observation_abc"
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true, verified: true, observationId: "observation_abc"
        })
      };
    };
    const gateway = createXsusAppHyperGateway({ verifyEvidence: verifyXsusHyperEvidence });
    await expect(gateway.execute("evidence.verify", {
      observationId: "observation_abc",
      accessToken: "test_access_token_123456789",
      endpoint: "https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify",
      fetchImpl
    })).resolves.toMatchObject({
      ok: true, verified: true, observationId: "observation_abc"
    });
  });
});
