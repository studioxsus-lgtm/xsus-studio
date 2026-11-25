# Future XSUS Web Build Engine deployment

Use the dedicated branch future-xsus-web-build-engine. Select the custom Blueprint path src/future-xsus-web-build-engine/render.yaml in Render, or configure an equivalent single-instance Node web service manually. Keep the repository root as the working directory. The starter service and persistent disk may incur charges; approve pricing before provisioning.

Supply the six unset environment variables through Render secrets/settings. Use verified HTTPS core endpoints implementing the Web contract 1.0.0, not assumed App endpoints. XSUS_AUTH_URL is the Supabase project origin; XSUS_AUTH_PUBLIC_KEY is its publishable key. Never commit tokens. The persistent registry requires one writer; do not scale horizontally.

Run node src/future-xsus-web-build-engine/probe-cli.mjs with configured core credentials before accepting production traffic. A successful /ready check alone does not prove external core compatibility. Verify authenticated POST /projects, GET /projects, GET /projects/:id/download, cross-user isolation, and persistence after restart. Generated artifacts remain drafts. Do not connect the public XSUS Web frontend until these checks pass.

Rollback: stop traffic and redeploy the previous verified commit, retaining the persistent disk. Back up data before schema changes. No deployment is performed by this file.
