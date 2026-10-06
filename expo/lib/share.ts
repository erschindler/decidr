import { Platform, Share as RNShare, Clipboard } from "react-native";
import { ShareMethod } from "@/types/decision";
import { supabase } from "@/lib/supabase";

/**
 * Canonical share URL for a debate. Never contains the AI verdict —
 * the vote-before-reveal rule applies to everything behind this URL.
 */
export const DEBATE_URL_BASE = "https://thedecidr.app/debate";

export function getDebateShareUrl(decisionId: string): string {
  return `${DEBATE_URL_BASE}/${decisionId}`;
}

/**
 * Share copy identifies the debate without spoiling the AI verdict.
 */
export function buildShareMessage(title: string, url: string): string {
  return `⚖️ DEBATE: ${title}\n\nChoose your side and see what the AI Judge thinks.\n${url}`;
}

/** Copy a link to the clipboard (web + native). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    Clipboard.setString(text);
    return true;
  } catch (err) {
    console.log("[Share] Copy failed:", err);
    return false;
  }
}

/** Open the OS-native share sheet (iOS/Android/Web Share API where available). */
export async function openNativeShare(title: string, message: string): Promise<boolean> {
  try {
    const result = await RNShare.share({ title, message });
    return !(result.action === "dismissedAction");
  } catch (err) {
    console.log("[Share] Native share failed:", err);
    return false;
  }
}

/** Web-only share intents (open in the target platform's share dialog). */
export function openWebShareIntent(method: Exclude<ShareMethod, "native" | "copy" | "other">, url: string, title: string): void {
  if (Platform.OS !== "web") return;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`${title} — choose your side on Decidr`);
  const targets: Record<string, string> = {
    x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(url)}`,
  };
  const target = targets[method];
  if (!target) return;
  try {
    window.open(target, "_blank", "noopener,noreferrer");
  } catch (err) {
    console.log("[Share] Web intent failed:", err);
  }
}

/**
 * Record a successful share event. Tracking failures never block sharing.
 * DB unique(user_id, decision_id, method) prevents duplicate inflation.
 */
export async function trackShare(decisionId: string, method: ShareMethod, userId: string | null): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase
      .from("decision_shares")
      .upsert(
        { user_id: userId, decision_id: decisionId, method },
        { onConflict: "user_id,decision_id,method", ignoreDuplicates: true }
      );
    if (error) {
      console.log("[Share] Tracking failed (non-critical):", error.message);
    }
  } catch (err) {
    console.log("[Share] Tracking exception (non-critical):", err);
  }
}
