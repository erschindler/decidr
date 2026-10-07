import { getConfig } from "../config";

/**
 * The web page reads a deliberately narrow set of public columns.
 * `ai_judgment` is intentionally NEVER selected — the AI verdict is
 * locked until someone votes in the app, and that rule extends here.
 */
const DEBATE_COLUMNS =
  "id,title,category,side_a,side_b,votes_a,votes_b,total_votes,status,created_at,profiles(display_name,avatar_url)";
const SUMMARY_COLUMNS = "id,title,category,votes_a,votes_b,total_votes,created_at";

export interface Side {
  title?: string;
  argument?: string;
  text?: string;
}

export interface Debate {
  id: string;
  title: string;
  category: string;
  side_a: Side | null;
  side_b: Side | null;
  votes_a: number;
  votes_b: number;
  total_votes: number;
  status: string;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
}

export interface DebateSummary {
  id: string;
  title: string;
  category: string;
  votes_a: number;
  votes_b: number;
  total_votes: number;
  created_at: string;
}

async function restFetch<T>(search: string): Promise<T> {
  const config = getConfig();
  if (!config) throw new Error("unconfigured");
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${search}`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`supabase_${response.status}`);
  return (await response.json()) as T;
}

/** Fetch one debate with its creator. Returns null when it doesn't exist. */
export async function fetchDebate(id: string): Promise<Debate | null> {
  const rows = await restFetch<Debate[]>(
    `decisions?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(DEBATE_COLUMNS)}&limit=1`
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Most-voted debates for the landing page. */
export async function fetchTrending(limit = 6): Promise<DebateSummary[]> {
  return restFetch<DebateSummary[]>(
    `decisions?select=${encodeURIComponent(SUMMARY_COLUMNS)}&order=total_votes.desc.nullslast&limit=${limit}`
  );
}

export function sideTitle(side: Side | null): string {
  return side?.title?.trim() || side?.text?.trim() || "";
}

export function sideArgument(side: Side | null): string {
  return side?.argument?.trim() || side?.text?.trim() || "";
}
