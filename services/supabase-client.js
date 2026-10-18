import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  "https://rdcwqjsmzklktfccebfs.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
