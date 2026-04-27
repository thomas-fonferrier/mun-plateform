import { createClient } from '@supabase/supabase-js';

function getServerSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getServerSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getServerSupabaseConfig();
  return createClient(supabaseUrl, supabaseAnonKey);
}
