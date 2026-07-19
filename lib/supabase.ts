import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

// Use service role key on the backend for writes if needed, but for MVP standard anon key is fine
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
