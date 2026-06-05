// External Supabase project client (gimnasio-bot org).
// Lovable Cloud's native integration cannot manage this project, so we
// instantiate a dedicated client here. Only the public anon key is used —
// never put a service role key in this file.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string;
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY as string;

export const supabaseExternal = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

// Alias so feature code can `import { supabase } from "@/integrations/supabase/external"`.
export const supabase = supabaseExternal;
