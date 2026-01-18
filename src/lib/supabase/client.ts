import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "\n\n❌ Missing Supabase environment variables!\n\n" +
      "Please ensure these are set in .env.local:\n" +
      "  - NEXT_PUBLIC_SUPABASE_URL\n" +
      "  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n" +
      "Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n"
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
