// Bakes the Supabase PUBLIC config from expo/.env into website/public/decidr-config.js.
// Reads only EXPO_PUBLIC_SUPABASE_* values (the same public anon key already shipped
// inside the Expo app). Never prints or copies private env values.
// Usage: bun website/scripts/bake-config.mjs
import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(new URL("../../expo/.env", import.meta.url), "utf8");

const pick = (name) => {
  const m = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};

const url = pick("EXPO_PUBLIC_SUPABASE_URL");
const key = pick("EXPO_PUBLIC_SUPABASE_KEY") || pick("EXPO_PUBLIC_SUPABASE_ANON_KEY");

if (!url.startsWith("https://") || !key) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY in expo/.env");
  process.exit(1);
}

const out = `// ─────────────────────────────────────────────────────────────────
// Decidr web configuration — public values by design; Row Level
// Security protects all sensitive data. This page only ever reads
// debate titles, sides, and vote counts. It NEVER loads the AI verdict.
// Regenerate with: bun website/scripts/bake-config.mjs
// ─────────────────────────────────────────────────────────────────
window.DECIDR_CONFIG = {
  supabaseUrl: "${url}",
  supabaseAnonKey: "${key}",
};
`;

writeFileSync(new URL("../public/decidr-config.js", import.meta.url), out);
console.log(`baked config: url ok, anon key length ${key.length}`);
