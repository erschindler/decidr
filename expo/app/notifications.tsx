import React, { useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  Share2,
  Trophy,
  CheckCheck,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useSocial } from "@/providers/SocialProvider";
import { AppNotification } from "@/types/decision";

const TYPE_META: Record<
  AppNotification["type"],
  { Icon: typeof UserPlus; color: string }
> = {
  friend_request: { Icon: UserPlus, color: Colors.dark.coral },
  friend_accepted: { Icon: UserCheck, color: Colors.dark.cyan },
  share: { Icon: Share2, color: Colors.dark.gold },
  vote_milestone: { Icon: Trophy, color: Colors.dark.gold },
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, getProfileById } = useSocial();

  const listRef = useRef<FlatList<AppNotification>>(null);

  // Auto-refresh happens via realtime; keep list stable while scrolling.
  useEffect(() => {
    console.log("[Notifications] Loaded", notifications.length, "notifications,", unreadCount, "unread");
  }, [notifications.length, unreadCount]);

  const handlePress = useCallback(
    (item: AppNotification) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!item.isRead) markNotificationRead(item.id);
      if (item.decisionId) {
        router.push(`/decision/${item.decisionId}`);
      } else if (item.type === "friend_request") {
        router.push("/friends");
      }
    },
    [markNotificationRead, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const meta = TYPE_META[item.type] ?? TYPE_META.share;
      const actor = item.actorId ? getProfileById(item.actorId) : null;
      const { Icon } = meta;
      return (
        <Pressable
          style={[styles.row, !item.isRead && styles.rowUnread]}
          onPress={() => handlePress(item)}
          testID={`notification-${item.id}`}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${meta.color}1A` }]}>
            {actor?.avatar ? (
              <Image source={{ uri: actor.avatar }} style={styles.actorAvatar} contentFit="cover" cachePolicy="none" />
            ) : (
              <Icon size={18} color={meta.color} />
            )}
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.body && (
              <Text style={styles.rowBody} numberOfLines={2}>
                {item.body}
              </Text>
            )}
            <Text style={styles.rowTime}>{getRelativeTime(item.createdAt)}</Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </Pressable>
      );
    },
    [handlePress, getProfileById]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backBtn}
          testID="notifications-back"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.unreadCount}>{unreadCount} new</Text>}
        </View>
        {unreadCount > 0 ? (
          <Pressable
            style={styles.markAllBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              markAllNotificationsRead();
            }}
            testID="notifications-mark-all"
          >
            <CheckCheck size={14} color={Colors.dark.cyan} />
            <Text style={styles.markAllText}>Read all</Text>
          </Pressable>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              Friend requests, vote milestones, and shares on your debates will show up here
            </Text>
          </View>
        }
        testID="notifications-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  topBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.dark.coral,
    backgroundColor: Colors.dark.coralDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  markAllBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.dark.cyanDim,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.dark.cyan,
  },
  topBarSpacer: {
    width: 70,
  },
  listContent: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  rowUnread: {
    backgroundColor: "rgba(255, 107, 107, 0.04)",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  actorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  rowBody: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  rowTime: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginTop: 3,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.coral,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    lineHeight: 19,
  },
});
