import type { SupabaseClient } from "@supabase/supabase-js";

export interface AppVersion {
  id: string;
  isActive: boolean;
}

export async function fetchVersions(supabase: SupabaseClient): Promise<AppVersion[]> {
  const { data, error } = await supabase.from("app_versions").select("id, is_active").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((v) => ({ id: v.id as string, isActive: v.is_active as boolean }));
}

export async function createVersion(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("app_versions").insert({ id });
  if (error) throw error;
}

export async function setActiveVersion(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.rpc("set_active_version", { p_id: id });
  if (error) throw error;
}
