# XSUS App private build storage — activation checklist

Status: **not deployed / not verified against production Supabase**.

The private bucket migration in `supabase/migrations/drafts/xsus_app_builds_private_bucket_review.sql` is a **review draft**, not an applied migration. Run `supabase/verification/xsus_app_builds_storage_readonly.sql` first in the real Supabase project.

## Security gate

1. Confirm `xsus-app-builds` is private. A private bucket alone is **not** sufficient to deny signed-in users: audit all `storage.objects` policies, including global policies that do not restrict `bucket_id`.
2. Confirm authenticated and anon clients cannot list, download, insert, update, delete, or create signed URLs for another user's build objects.
3. Confirm server service-role credentials exist only in Render's server-side secret environment and never in GitHub Pages, browser JS, build responses, or logs.
4. Confirm `public.xsus_app_projects` exists with UUID IDs, ownership enforcement, and audited RLS before mounting the Hyper application route.
5. Verify the object upload and authenticated readback endpoints against the installed Supabase Storage API. The cleanup DELETE request format is **not yet validated against the live service**.
6. Test partial upload, readback mismatch, cleanup failure, retries, duplicate artifact IDs, cross-owner access, expired JWT, revoked access, and unexpected global Storage policies.
7. Implement durable orphan reconciliation. Best-effort cleanup does not guarantee removal.
8. Require all eight production readiness checks, real end-to-end evidence, and an explicit enable flag. Do not mark checks true based solely on mocked tests.
9. Keep Hyper XSUS Core independent of XSUS AI Core and the language engine. Do not mount a public route before all gates pass.

The current static web builder creates a deterministic three-file starter, not arbitrary prompt-to-app compilation or a native mobile app.
