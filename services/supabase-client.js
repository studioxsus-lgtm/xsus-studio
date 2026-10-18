
/**
 * XSUS Studio — Central Supabase Client
 * Përdoret nga modulet e XSUS Studio.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "VENDOS_PROJECT_URL_KETU";
const SUPABASE_PUBLISHABLE_KEY = "VENDOS_PUBLISHABLE_KEY_KETU";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

