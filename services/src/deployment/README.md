# XSUS App — isolated deployment validation service

This Node.js service is **independent of XSUS AI Core**. It does not import or modify `server.js`, the `feature/xsus-ai-core` branch, or the existing Render `xsus-studio` service.

## Local startup
From repository root (Node 20+):

```sh
PORT=3001 XSUS_APP_ALLOWED_ORIGINS=https://www.xsusstudio.com node services/src/deployment/standalone-server.js
```

`GET /healthz` responds with `deploymentEnabled:false`. `POST /api/deployments/validate` remains fail-closed (503) until trusted Supabase clients, authoritative project ownership queries and trusted artifact storage are injected. No endpoint can execute deployments.

## Existing Render service (created, verified live on initial deployment)
- Name: `xsus-app-deployment-api`
- Repository: `studioxsus-lgtm/xsus-studio`
- Branch: `main`
- Runtime: Node.js 20+
- Current root directory: repository root (isolation change not yet applied)
- Current build command: `npm install`
- Current start command: `node services/src/deployment/standalone-server.js`
- Health check: `/healthz`
- Environment: `XSUS_APP_ALLOWED_ORIGINS=https://www.xsusstudio.com` (no provider secrets until backend integration is audited)

Do **not** repoint or redeploy existing `xsus-studio` or `future-xsus-core-api` services. The current API is validation-only and not production-ready for authorization until trusted dependencies and rate limits are configured. Avoid treating a passing health check as deployment authorization.

## Phase 15.5 — dependency isolation and smoke tests
The standalone service now has its own `services/src/deployment/package.json` with **zero declared third-party runtime dependencies**. From that directory run `node --test tests/*.node-test.js` or `npm test`. This does not mean the existing root dependency audit is resolved: Render currently runs `npm install` at repository root, and the initial deployment reported **2 critical and 1 moderate** npm audit findings. Their package identities and exploitability have not been established.

For a future **isolated** build of this service, use Render root directory `services/src/deployment`, build command `npm install --omit=dev`, start command `npm start`, and health path `/healthz`. Do not apply these settings to existing XSUS AI Core or Future XSUS Core services. This proposed change needs a reviewed redeployment of only `xsus-app-deployment-api`. Its production authorization remains disabled until trusted project and artifact stores are implemented.

## Phase 15.8 — reviewed Render settings, not yet applied
The manual live-smoke workflow was reported passing on main. The current Render deployment still uses repository-root `npm install`; a successful HTTP smoke test does **not** establish that root dependencies are safe.

The separate `render-service.yaml` is a **reference configuration**, not an applied Blueprint. Change **only** the existing `xsus-app-deployment-api` service's Root Directory to `services/src/deployment`, Build Command to `npm install --omit=dev`, Start Command to `npm start`, and Health Check Path to `/healthz`. Leave auto-deploy off. After redeploying that service, rerun the live smoke workflow and check its build logs for dependency audit findings. Do not change the `xsus-studio` or `future-xsus-core-api` services.

### Supabase integration gate
No database schema or trusted artifact store has yet been verified. Do not add a service-role key or enable authorization solely on the strength of the smoke test. Before wiring the backend, confirm table and storage policies, ownership enforcement, secret handling, and rate limits; then add integration tests using a dedicated test project. The endpoint must remain validation-only and fail-closed until these checks pass.

## Phase 15.9 — security regression gates
Nine isolated Node HTTP tests now cover health, route separation, methods, authentication gate, missing trusted backend, untrusted origins, oversized bodies, and unsupported content types. The manually triggered live-smoke workflow additionally probes these rejection cases against the deployed service without credentials or state-changing operations. The live-smoke test is **not** a substitute for project ownership and Supabase RLS integration tests.

These changes affect only the XSUS App deployment service tests and documentation. They do not change the Render service settings or trigger a deploy (auto-deploy is disabled). After applying the isolated Render root-directory settings and redeploying this service alone, rerun the manual live smoke and verify the results.

## Phase 16.0 — identity invalidation and ownership boundary
The Supabase adapter now invalidates any cached verified identity **before** each new `getUser(accessToken)` call. A failed reauthentication therefore cannot reuse a previously verified identity. Six isolated Node tests cover ownership, cross-user denial, forged identities, invalid identifiers/targets, and expired-token invalidation. They run in the independent XSUS App API CI job and are not Vitest files.

**Important:** these are unit tests with injected fake clients/stores, not live Supabase RLS or artifact-store verification. The current Render service still has no trusted Supabase dependencies injected, and the validation endpoint remains fail-closed. Before enabling production integration, inspect the actual database schema, project owner column, RLS policies, storage permissions, token handling and rate limiting. Never add secrets to source control.

## Phase 16.1 — Supabase configuration readiness (no database access)
`supabase-readiness.js` provides a configuration-only preflight for the required URL and distinct key presence. It never returns key values or makes network requests. A configured result **never** implies that project ownership, RLS, artifact storage, or deployment authorization is ready. The five new Node tests run via the isolated package's `npm test` command.

**Required next evidence before enabling integration:** actual Supabase project schema and table/column names, RLS and FORCE RLS policy definitions, storage bucket and access policies, plus a dedicated test account and project. Do not guess these from the frontend code. No production credentials should be committed, printed or copied into logs. The current Render service remains disconnected from Supabase and deployment execution remains disabled.

## Phase 16.2 — verified migration contracts (repository only)
Reviewed the existing migrations `20261120093000_xsus_builder_projects.sql`, `20261120112000_delete_own_builder_projects.sql` and `20261120122000_update_own_builder_projects.sql`. The table is `public.xsus_builder_projects`, with UUID `id` and `owner_id`, `name`, JSONB `snapshot`, and `created_at`. The migrations specify ENABLE and FORCE RLS and ownership-based SELECT/INSERT/UPDATE/DELETE policies. This is **not proof** of their application in the live Supabase database.

`supabase-project-store.js` adds a read-only, injected-client adapter that queries `id,owner_id` with **both** UUID project and owner filters and rechecks the returned owner. Five isolated Node tests verify query scoping and fail-closed behavior. The adapter is not wired into the live Render API. No storage schema has been verified, so no artifact store is implemented.

**Contract mismatch to resolve before production:** deployment request and authorization validators currently allow generic 1–128 character IDs, but the actual builder project table uses UUID. The read-only adapter rejects non-UUID IDs. Update the shared frontend/backend deployment request contract together, after checking existing project IDs and tests, before enabling the endpoint. Do not change the existing table schema solely to fit an API placeholder.

## Phase 16.3 — persisted UUID compatibility gate
The real frontend `assets/js/xsus-app/account-projects.js` saves and loads account projects from `xsus_builder_projects`; its persisted IDs are generated as UUIDs. Older deployment-contract tests still use temporary IDs such as `project_1`. The new `project-id-contract.js` explicitly distinguishes a persisted UUID from a temporary draft ID, and the owner-scoped project store reuses this check. Three isolated Node tests cover valid IDs, invalid drafts, and rejection of silent normalization.

**Compatibility rule:** do not automatically translate `project_1` into a persisted UUID, and do not change the existing `deployment.request` contract or tests until the frontend deployment workflow is updated together with the server. A successful local draft is not proof of a saved, owned Supabase project. The API remains validation-only, disconnected from the production database, and deployment-disabled.

## Phase 16.4 — bounded artifact verification
The validation service checks each **trusted server-side** artifact against the client-declared SHA-256 and byte count. It now rejects trusted artifacts larger than 1 MiB each or 2 MiB combined. Six independent Node tests cover a valid validation-only result, digest mismatch, individual and aggregate size ceilings, missing artifacts, and duplicate client file names. No provider deployment is enabled.

**Pending:** there is still no verified, production-backed artifactStore implementation for the persisted `xsus_builder_projects.snapshot` structure. Do not treat a client-provided file body as authoritative or claim the snapshot format is a trusted build artifact. Inspect real saved snapshots and their generation pipeline before adding an extractor, with no sensitive user content copied to logs. Tests and CI must pass before a reviewed redeploy of the XSUS App service only.

## Phase 16.5 — saved snapshot source assessment
Reviewed `assets/js/xsus-app/account-projects.js`: `captureProject()` saves a version 1 snapshot containing `session` (including optional `generatedHtml`), `goal`, `steps`, `reviews` and `boards`. The browser stores this in `xsus_builder_projects.snapshot` and uses owner-filtered Supabase queries. This format does **not** establish a trusted `index.html` / `styles.css` / `app.js` artifact trio.

`builder-snapshot-inspection.js` performs read-only, content-free shape inspection and **always** returns `deployable:false` and `hasVerifiedBuildArtifacts:false`. Four Node tests check valid/invalid shapes, non-disclosure and fail-closed behavior. It is intentionally not wired to the live API. A future trusted artifact builder must reconstruct or verify each file server-side from an authenticated owner's saved project, with explicit versioned build rules and tests. Do not publish a raw snapshot or interpret browser HTML as a verified bundle.

## Phase 16.6 — deterministic artifact manifest (not a builder)
`trusted-artifact-manifest.js` creates a deterministic SHA-256 and UTF-8 byte-count manifest from an **already server-supplied** set of exactly three named text files. It enforces 1 MiB per file and 2 MiB combined and never includes file contents in its result. The output explicitly sets `verifiedSource:false` and `deployable:false`: this helper does **not** establish provenance, implement a build pipeline, or grant deployment permission. Six isolated Node tests cover determinism, content non-disclosure, invalid shape, size ceilings and immutable output.

**Next required step:** design and test a trusted builder against the actual persisted project snapshot format; decide how HTML/CSS/JS are generated without trusting arbitrary browser-submitted files. Keep live deployment disabled and do not infer success from code commits alone; verify the CI workflow results before deploying.

## Phase 16.7 — server-side static build preflight
Reviewed the existing browser `code-generation/build-pipeline.js`, `source-validator.js` and `artifact-integrity.js`. Browser `prepareBuild` validates three text files and creates a manifest; it is **not** a trusted server-side generator. The new `server-build-preflight.js` independently checks the three server-supplied files, size limits, basic HTML document structure and nonempty content, and produces a deterministic digest manifest. Five Node tests cover valid/invalid inputs, confidentiality and fail-closed behavior. This is a static preflight only: it does not compile or execute JavaScript, verify provenance, access Supabase, or deploy. Even a successful result always returns `deployable:false`.

Next: implement a server-side builder only after defining how saved `snapshot` data can be converted into trusted sources. Avoid copying browser-generated HTML directly into a deployable artifact without a reviewed trust policy.

## Phase 16.8 — provenance contract (not an attestation authority)
`trusted-build-source.js` defines the minimum metadata expected from a future trusted server builder: persisted project and owner UUIDs, server-generated origin, independent authorization and revision checks, builder version, and SHA-256 source digest. Its `inspectTrustedBuildSource` function checks **shape only**, not the truth of the flags: browser-provided objects must NEVER be passed to it as proof. It always returns `deployable:false`. Six Node tests cover missing verification, invalid IDs, client/browser origin, malformed input, confidentiality and immutability.

The repository's last combined commit-status lookup did not return status checks; that does not prove CI passed. Before production integration, run the isolated deployment suite, verify live DB migration/RLS state and add server-controlled provenance attestation that cannot be forged by request bodies. No service deployment or Supabase write was performed in this phase.

## Phase 16.9 — ownership-first build review orchestration
`build-review-pipeline.js` composes an injected owner-scoped project lookup and an injected server-only builder with `inspectServerBuild`. Invalid UUIDs, missing dependencies, mismatched ownership, malformed artifacts and exceptions fail closed. The builder is not invoked if ownership fails. A successful static review returns a manifest with `deployed:false` and `deployable:false`. Six isolated Node tests cover these boundaries.

**Important:** the injected builder is not yet implemented for real Supabase snapshots, and the pipeline is not connected to the live HTTP endpoint. The returned `ready-for-review` status is NOT a production deployment approval. Never use browser-supplied `files` or `source` flags as trusted builder output. CI/test execution and live schema/RLS verification remain pending.

## Phase 17.0 — isolated integration coverage
`tests/build-review-integration.node-test.js` adds five native Node integration tests composing the actual `createBuilderProjectStore` and `reviewSavedProjectBuild` implementations against a mocked, owner-scoped Supabase query. Cases cover success as review-only, absent project, database error, mismatched owner, and rejection of a browser snapshot as build files. This verifies the orchestration contract **only when tests execute**; it does not verify live Supabase access, live RLS, or a real server-side builder. The existing GitHub Actions workflow `xsus-app-deployment-api.yml` includes `npm test` for `*.node-test.js` on changes under `services/src/deployment/**`. A previous combined status lookup returned no statuses; confirm Actions run logs separately before asserting green CI.

## Phase 17.1 — owner-scoped read-only snapshot inspection
`supabase-snapshot-reader.js` introduces `createBuilderSnapshotReader(client)`, requiring a server-injected Supabase client and selecting `id,owner_id,snapshot` with both project and owner filters. It verifies the returned IDs and calls `inspectBuilderSnapshot` only to return content-free shape metadata. It never exposes the snapshot, never produces build files, and always reports `deployable:false`. Five Node tests cover valid ownership, invalid IDs, mismatched/missing rows, database errors, and unsupported snapshots.

**CI status:** the GitHub commit workflow-run lookup for the prior commit returned no runs; this endpoint only reports pull-request-triggered runs and therefore cannot confirm push CI status. Test execution and production Supabase connectivity are not verified. Keep this adapter disconnected from public HTTP until server-side identity and RLS/service-role controls are reviewed.

## Phase 17.2 — explicit production readiness gate
`deployment-readiness-gate.js` combines static build review, saved-project snapshot inspection, and provenance inspection results for diagnostic use. It intentionally **never** authorizes production deployment: even when all three inputs are structurally valid, `PRODUCTION_DEPLOYMENT_NOT_ENABLED` remains a blocker. Six Node tests cover the all-pass case, absent inputs, forged approval/deployment flags, missing projects, unverified provenance and immutable output. This gate is not wired to production deployment execution.

**CI verification limitation:** GitHub's available commit-status endpoint returned no statuses, and its workflow-run lookup is limited to pull-request-triggered runs. Those results do not establish whether push-triggered Actions passed. Tests have been committed but have not been executed in this session; check the workflow run in GitHub Actions before any production change.

## Phase 17.3 — cross-module readiness integration regression
`tests/deployment-readiness-integration.node-test.js` adds five integration scenarios exercising the actual review pipeline, snapshot inspector, provenance inspector, and readiness gate together. It covers nominal mocked components (still not deployable), ownership mismatch, browser snapshot substituted for build files, unsupported snapshot version, and browser-origin provenance. The existing isolated Node workflow includes this file through `npm test`.

This phase adds tests only; it does not connect a production Supabase client, run tests, deploy Render, or enable publishing. GitHub Actions push-run visibility remains unconfirmed via the available connector endpoints. Verify workflow results directly before claiming green CI.

## Phase 17.4 — Render deployment state and production defaults
Read-only Render verification of the independent `xsus-app-deployment-api` service found `autoDeploy:no`, branch `main`, and only one live deployment, at commit `66fee40e4314264ed37ec100d694aace21f9093e`. The newer deployment-module commits have **not** been deployed. The service remains separate from the XSUS AI Core and Future XSUS Core services. No deployment was triggered.

`tests/production-defaults.node-test.js` adds an isolated local HTTP regression test verifying that `GET /healthz` explicitly reports `deploymentEnabled:false`, that an execution route returns 404, and that GET on the validation route returns 405. The test is included by the existing `npm test` workflow. **Tests still require execution/CI confirmation.** Do not redeploy or activate production integration until the isolated test suite is green and a trusted builder plus server-side authorization are reviewed.

## Phase 17.6 — ownership recheck after asynchronous build
`build-review-pipeline.js` now calls the owner-scoped `findOwnedProject` a second time after successful static build preflight, denying review if the project was deleted or its owner no longer matches. Three additional Node tests cover repeated verification, deletion and owner change. The integration mock resets its query-filter state after each lookup to support repeated calls.

**Scope:** this is an ownership recheck, not a snapshot revision lock or transaction; concurrent content edits can still occur and must be addressed before any publishing implementation. No live deployment, Supabase write or CI success claim is implied.

## Phase 17.7 — project revision stability contract
`project-revision-contract.js` exports `inspectStableProjectRevision(before,after)` for fail-closed comparison of opaque revision tokens obtained from trusted server-side reads. It never returns token contents and always reports `deployable:false`. Four Node tests cover unchanged tokens, changed tokens, malformed/missing tokens, and immutable output. This is **not** yet connected to the persisted `xsus_builder_projects` schema or build-review pipeline: the current owner lookup only selects `id,owner_id`, and no trusted server-side revision source has been verified. Do not substitute user-supplied `snapshot.saveToken` as an authority. Real revision locking and CI verification remain pending.

## Phase 17.8 — persisted snapshot digest comparison
`supabase-project-revision-reader.js` exports `createBuilderProjectRevisionReader(client)`, a read-only owner-scoped Supabase adapter selecting `id,owner_id,snapshot`. It hashes the JSON representation of the server-retrieved snapshot with SHA-256, returning only the digest (or null on missing, invalid, or inaccessible data). `tests/supabase-project-revision-reader.node-test.js` adds five Node tests for unchanged and changed snapshots, ownership mismatch, failures, and invalid IDs.

**Limitations:** digest comparison is not a transactional revision lock, and this reader is not yet wired into the build-review pipeline. JSON serialization order must be stable for the same persisted JSONB representation; the reader detects content changes between observed reads but cannot guarantee no later writes. Production Supabase migration/application and CI test execution are not verified. Never treat browser-provided save tokens or digest values as trusted revision evidence. Deployment remains disabled.

## Phase 17.9 — revision-guarded static build review
`revision-guarded-build-review.js` exports `reviewBuildWithRevisionGuard`, a separate fail-closed orchestration that requires a server-injected `readOwnedRevision` dependency, checks the initial digest, invokes the existing ownership-checked static review, and re-reads the digest before returning a review-only result. Changed/missing revisions, failed ownership, invalid identity, and exceptions deny without exposing content. Eight native Node tests cover these paths.

This is not wired to the public HTTP handler or production Supabase. Its before/after comparison detects observed concurrent changes but **does not guarantee atomicity** or prevent edits after the final read. No production deploy is authorized. CI execution remains unverified.

## Phase 18.0 — canonical JSONB revision digests
`snapshot-revision-digest.js` canonicalizes nested JSON values by sorting object keys while preserving array order before hashing. The owner-scoped `supabase-project-revision-reader.js` now uses this helper instead of hashing the incidental JSON serialization order. Five Node tests cover object-key reordering, content edits, array-order sensitivity, malformed/oversized values, and non-disclosure.

This remains read-only validation, not a transactional lock. The code is committed but no complete CI run or live Supabase integration was verified in this phase. Render deployment is unchanged; XSUS AI Core and Future XSUS Core remain untouched.
