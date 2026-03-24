import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://ffyhfxoadmlenxwjqwch.supabase.co";
const supabaseAnonKey = "sb_publishable_eDkIeflTBR2ndMnZNf3rGQ_as025VDl";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
