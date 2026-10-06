import React, { useCallback, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X, Link2, Share2, Check } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  getDebateShareUrl,
  buildShareMessage,
  copyToClipboard,
  openNativeShare,
  openWebShareIntent,
  trackShare,
} from "@/lib/share";

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  decisionId: string;
  decisionTitle: string;
}

type Option = {
  id: "copy" | "x" | "facebook" | "reddit" | "email" | "native";
  label: string;
  emoji: string;
};

const OPTIONS: Option[] = [
  { id: "copy", label: "Copy Link", emoji: "🔗" },
  { id: "x", label: "X", emoji: "𝕏" },
  { id: "facebook", label: "Facebook", emoji: "📘" },
  { id: "reddit", label: "Reddit", emoji: "👽" },
  { id: "email", label: "Email", emoji: "✉️" },
  { id: "native", label: "More…", emoji: "📲" },
];

/**
 * In-app share sheet for debates. Uses the OS share sheet where supported
 * and falls back to Copy Link + web intents. Share copy never reveals the
 * AI verdict (vote-before-reveal applies to the share payload too).
 */
export function ShareSheet({ visible, onClose, decisionId, decisionTitle }: ShareSheetProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(
    async (option: Option) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const url = getDebateShareUrl(decisionId);
      const message = buildShareMessage(decisionTitle, url);

      if (option.id === "copy") {
        const ok = await copyToClipboard(url);
        if (ok) {
          setCopied(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => setCopied(false), 2000);
          void trackShare(decisionId, "copy", user?.id ?? null);
        }
        return;
      }

      if (option.id === "native") {
        if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
          try {
            await navigator.share({ title: decisionTitle, text: "Choose your side and see what the AI Judge thinks.", url });
            void trackShare(decisionId, "native", user?.id ?? null);
          } catch {
            // user dismissed the browser share sheet
          }
        } else {
          const shared = await openNativeShare(decisionTitle, message);
          if (shared) void trackShare(decisionId, "native", user?.id ?? null);
        }
        onClose();
        return;
      }

      if (Platform.OS === "web") {
        openWebShareIntent(option.id, url, decisionTitle);
        void trackShare(decisionId, option.id, user?.id ?? null);
      } else {
        // On native, hand off to the target app via deep link where possible.
        const target = option.id === "x" ? "twitter://" : null;
        if (target) {
          const canOpen = await Linking.canOpenURL(target);
          if (canOpen) {
            void Linking.openURL(target);
          } else {
            const ok = await copyToClipboard(url);
            if (ok) {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          }
        } else {
          const ok = await copyToClipboard(url);
          if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }
        void trackShare(decisionId, option.id, user?.id ?? null);
      }
    },
    [decisionId, decisionTitle, onClose, user?.id]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>Share Debate</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} testID="share-sheet-close">
              <X size={18} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            {decisionTitle}
          </Text>
          <View style={styles.optionsRow}>
            {OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={styles.option}
                onPress={() => void handleShare(option)}
                testID={`share-option-${option.id}`}
              >
                <View style={[styles.optionIcon, option.id === "copy" && copied && styles.optionIconCopied]}>
                  {option.id === "copy" && copied ? (
                    <Check size={22} color={Colors.dark.success} />
                  ) : option.id === "native" ? (
                    <Share2 size={20} color={Colors.dark.text} />
                  ) : (
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  )}
                </View>
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {option.id === "copy" && copied ? "Copied!" : option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.footerNote}>
            <Link2 size={12} color={Colors.dark.textTertiary} />
            <Text style={styles.footerNoteText}>
              Anyone with the link can vote — the AI verdict stays locked until they vote.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.surfaceHighlight,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.dark.surfaceHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    marginTop: 6,
    marginBottom: 18,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  option: {
    alignItems: "center",
    width: 64,
    gap: 6,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.dark.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionIconCopied: {
    borderColor: Colors.dark.success,
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.dark.border,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    color: Colors.dark.textTertiary,
    lineHeight: 15,
  },
});
