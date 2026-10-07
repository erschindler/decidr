// ─────────────────────────────────────────────────────────────────
// Decidr web configuration — public values by design; Row Level
// Security protects all sensitive data. This page only ever reads
// debate titles, sides, and vote counts. It NEVER loads the AI verdict.
// Regenerate with: bun website/scripts/bake-config.mjs
// ─────────────────────────────────────────────────────────────────
window.DECIDR_CONFIG = {
  supabaseUrl: "https://kkemayksfncenxztvvsn.supabase.co",
  supabaseAnonKey: "sb_publishable_a8QKceyKl6DeS8B7Ia6IiA_SVJbGe6W",
};
