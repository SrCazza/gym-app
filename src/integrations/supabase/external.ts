// External Supabase project client (gimnasio-bot org).
// Lovable Cloud's native integration cannot manage this project, so we
// instantiate a dedicated client here. Only the public anon key is used —
// never put a service role key in this file.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://qaqbrhnmforncwlgbavv.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWJyaG5tZm9ybmN3bGdiYXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDkzMjUsImV4cCI6MjA5NDc4NTMyNX0.Wy7SdIqdCXMc4VUEhEIEn5CF92irODc8bxkW9zKMo3o";

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
