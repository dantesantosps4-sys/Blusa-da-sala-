import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Chave do admin, enviada às RPCs administrativas. */
export const ADMIN_KEY =
  (import.meta.env.VITE_ADMIN_KEY as string | undefined) ?? "";

export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "public-anon-placeholder",
);
