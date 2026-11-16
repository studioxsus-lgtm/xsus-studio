-- Hyper XSUS Core: durable evidence checkpoints, server-only access.
-- Apply manually in the trusted Supabase SQL editor after review.
-- The service_role key must never be shipped to the browser.
BEGIN;

CREATE TABLE IF NOT EXISTS public.xsus_evidence_checkpoints (
  checkpoint_key text PRIMARY KEY,
  revision bigint NOT NULL CHECK (revision > 0),
  checkpoint jsonb NOT NULL CHECK (jsonb_typeof(checkpoint) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT xsus_evidence_checkpoint_key_format
    CHECK (checkpoint_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  CONSTRAINT xsus_evidence_checkpoint_revision_matches
    CHECK ((checkpoint->>'revision') ~ '^[0-9]+$'
      AND (checkpoint->>'revision')::bigint = revision)
);

ALTER TABLE public.xsus_evidence_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xsus_evidence_checkpoints FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.xsus_evidence_checkpoints FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.xsus_evidence_checkpoints TO service_role;

CREATE OR REPLACE FUNCTION public.xsus_evidence_checkpoint_cas(
  p_key text, p_expected_revision bigint, p_checkpoint jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
     OR p_expected_revision IS NULL OR p_expected_revision < 0
     OR p_checkpoint IS NULL OR jsonb_typeof(p_checkpoint) <> 'object'
     OR (p_checkpoint->>'revision') !~ '^[0-9]+$'
     OR (p_checkpoint->>'revision')::bigint <> p_expected_revision + 1
  THEN
    RAISE EXCEPTION 'Invalid evidence checkpoint CAS request';
  END IF;

  IF p_expected_revision = 0 THEN
    INSERT INTO public.xsus_evidence_checkpoints (checkpoint_key, revision, checkpoint)
    VALUES (p_key, 1, p_checkpoint)
    ON CONFLICT (checkpoint_key) DO NOTHING;
  ELSE
    UPDATE public.xsus_evidence_checkpoints
    SET revision = p_expected_revision + 1,
        checkpoint = p_checkpoint,
        updated_at = now()
    WHERE checkpoint_key = p_key AND revision = p_expected_revision;
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.xsus_evidence_checkpoint_cas(text,bigint,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.xsus_evidence_checkpoint_cas(text,bigint,jsonb)
  TO service_role;
COMMIT;
