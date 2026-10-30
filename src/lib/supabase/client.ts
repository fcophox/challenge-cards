import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Newer projects issue a publishable key; older ones an anon key.
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

/** Returns null when Supabase env vars are not configured (pure local mode). */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  client = url && SUPABASE_KEY ? createClient(url, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  return client;
}

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && SUPABASE_KEY);
