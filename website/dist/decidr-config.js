// ─────────────────────────────────────────────────────────────────
// Decidr web configuration — EDIT THESE TWO VALUES, then redeploy.
//
//   supabaseUrl:     your Supabase project URL
//                    (same value as EXPO_PUBLIC_SUPABASE_URL in the app)
//   supabaseAnonKey: your Supabase anon/public key
//                    (same value as EXPO_PUBLIC_SUPABASE_KEY in the app)
//
// These are public values by design — all sensitive data is protected
// by Supabase Row Level Security. This page only ever reads debate
// titles, sides, and vote counts. It NEVER loads the AI verdict.
// ─────────────────────────────────────────────────────────────────
window.DECIDR_CONFIG = {
  supabaseUrl: "https://kkemayksfncenxztvvsn.supabase.co",
  supabaseAnonKey: "",
};
