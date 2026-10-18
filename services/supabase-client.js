// services/supabase-client.js
// XSUS Studio — Supabase Client
// Version 1.0.0

import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

// Supabase Project URL
const SUPABASE_URL =
  "https://rdcwqjsmzklktfccebfs.supabase.co";

// Supabase Publishable Key
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Export configuration status
export const supabaseConfig = {
  configured: Boolean(
    SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
  ),
  projectUrl: SUPABASE_URL
};
