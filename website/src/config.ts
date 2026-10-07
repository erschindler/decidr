interface DecidrConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

declare global {
  interface Window {
    DECIDR_CONFIG?: Partial<DecidrConfig>;
  }
}

/**
 * Runtime config comes from /decidr-config.js (edit + redeploy, no rebuild),
 * with build-time VITE_ env vars as a fallback. Returns null when either
 * value is missing so pages can show a graceful state.
 */
export function getConfig(): DecidrConfig | null {
  const runtime = typeof window !== "undefined" ? window.DECIDR_CONFIG : undefined;
  const url = runtime?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || "";
  const key = runtime?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url.startsWith("https://") || !key) return null;
  return { supabaseUrl: url.replace(/\/+$/, ""), supabaseAnonKey: key };
}
