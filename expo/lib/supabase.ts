import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
    console.warn("[Supabase] Invalid or missing EXPO_PUBLIC_SUPABASE_URL:", supabaseUrl);
    return createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  console.log("[Supabase] Initializing with URL:", supabaseUrl);
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();

export function extractAvatarPath(rawUrl: string): string {
  const storagePattern = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/avatars\/(.+?)(?:\?|$)/;
  const match = rawUrl.match(storagePattern);
  if (match?.[1]) {
    return decodeURIComponent(match[1].split("?")[0]);
  }
  return rawUrl;
}

export async function resolveAvatarUrl(rawUrl: string | null | undefined): Promise<string> {
  if (!rawUrl || rawUrl.trim() === "") return "";

  console.log("[Avatar] resolveAvatarUrl input:", rawUrl);

  if (rawUrl.startsWith("data:") || rawUrl.startsWith("file:") || rawUrl.startsWith("content:")) {
    return rawUrl;
  }

  if (rawUrl.includes("dicebear.com") || rawUrl.includes("gravatar.com")) {
    return rawUrl;
  }

  const sUrl = supabaseUrl;

  let storagePath: string;

  if (rawUrl.startsWith("http")) {
    if (sUrl && rawUrl.includes(sUrl) && rawUrl.includes("/storage/v1/")) {
      storagePath = extractAvatarPath(rawUrl);
      if (storagePath === rawUrl) {
        console.log("[Avatar] Could not extract path from full URL, returning raw");
        return rawUrl;
      }
    } else {
      console.log("[Avatar] External URL, returning as-is");
      return rawUrl;
    }
  } else {
    storagePath = rawUrl;
  }

  console.log("[Avatar] Using storage path:", storagePath);

  try {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("avatars")
      .createSignedUrl(storagePath, 3600);

    if (signedData?.signedUrl) {
      console.log("[Avatar] Signed URL OK for:", storagePath);
      return signedData.signedUrl;
    }

    if (signedError) {
      console.log("[Avatar] Signed URL failed:", signedError.message);
    }
  } catch (err) {
    console.log("[Avatar] Signed URL exception:", err);
  }

  try {
    const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(storagePath);
    if (pubData?.publicUrl) {
      console.log("[Avatar] Using public URL fallback:", pubData.publicUrl);
      return pubData.publicUrl;
    }
  } catch (err) {
    console.log("[Avatar] Public URL exception:", err);
  }

  console.log("[Avatar] All strategies failed, returning raw URL");
  return rawUrl;
}

export async function resolveAvatarUrls(
  profiles: Array<{ id: string; avatar_url?: string | null; [key: string]: unknown }>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const promises = profiles.map(async (p) => {
    const resolved = await resolveAvatarUrl(p.avatar_url);
    result[String(p.id)] = resolved;
  });
  await Promise.all(promises);
  return result;
}
