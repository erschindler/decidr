import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  Heart,
  MessageSquare,
  UserPlus,
  UserCheck,
  Vote,
  Users,
  ChevronRight,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useSocial } from "@/providers/SocialProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ActivityItem } from "@/types/social";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    activities,
    pendingRequests,
    acceptedFriends,
    refreshSocial,
    respondToFriendRequest,
  } = useSocial();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    console.log("[Activity] Pull to refresh");
    refreshSocial();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshSocial]);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "like":
        return { Icon: Heart, color: "#FF4B6E", bg: "rgba(255, 75, 110, 0.12)" };
      case "comment":
        return { Icon: MessageSquare, color: Colors.dark.cyan, bg: Colors.dark.cyanDim };
      case "friend_request":
        return { Icon: UserPlus, color: Colors.dark.gold, bg: Colors.dark.goldDim };
      case "friend_accepted":
        return { Icon: UserCheck, color: Colors.dark.success, bg: "rgba(34, 197, 94, 0.12)" };
      case "vote":
        return { Icon: Vote, color: Colors.dark.coral, bg: Colors.dark.coralDim };
      default:
        return { Icon: Heart, color: Colors.dark.textTertiary, bg: Colors.dark.surface };
    }
  };

  const getActivityText = (item: ActivityItem) => {
    const isMe = item.userId === user?.id;
    const name = isMe ? "You" : item.userName;
    switch (item.type) {
      case "like":
        return `${name} liked "${item.decisionTitle ?? "a debate"}"`;
      case "comment":
        return `${name} commented on "${item.decisionTitle ?? "a debate"}"`;
      case "friend_request":
        return isMe ? `You sent a friend request` : `${name} sent you a friend request`;
      case "friend_accepted":
        return `${name} accepted a friend request`;
      case "vote":
        return `${name} voted on "${item.decisionTitle ?? "a debate"}"`;
      default:
        return `${name} did something`;
    }
  };

  const renderActivity = useCallback(
    ({ item }: { item: ActivityItem }) => {
      const { Icon, color, bg } = getActivityIcon(item.type);
      return (
        <Pressable
          style={styles.activityRow}
          onPress={() => {
            if (item.decisionId) {
              router.push(`/decision/${item.decisionId}`);
            } else if (item.userId !== user?.id) {
              router.push(`/user/${item.userId}`);
            }
          }}
          testID={`activity-${item.id}`}
        >
          <Pressable
            onPress={() => {
              if (item.userId !== user?.id) {
                router.push(`/user/${item.userId}`);
              }
            }}
          >
            {item.userAvatar ? (
              <Image source={{ uri: item.userAvatar }} style={styles.activityAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.activityIconCircle, { backgroundColor: bg }]}>
                <Icon size={16} color={color} />
              </View>
            )}
          </Pressable>
          <View style={styles.activityContent}>
            <Text style={styles.activityText} numberOfLines={2}>
              {getActivityText(item)}
            </Text>
            {item.commentText && (
              <Text style={styles.activityComment} numberOfLines={1}>
                "{item.commentText}"
              </Text>
            )}
            <Text style={styles.activityTime}>{getRelativeTime(item.createdAt)}</Text>
          </View>
          <View style={[styles.activityTypeDot, { backgroundColor: bg }]}>
            <Icon size={12} color={color} />
          </View>
        </Pressable>
      );
    },
    [router, user?.id]
  );

  const renderFriendRequest = useCallback(
    ({ item }: { item: typeof pendingRequests[number] }) => (
      <View style={styles.requestCard}>
        <Pressable
          style={styles.requestUser}
          onPress={() => router.push(`/user/${item.requesterId}`)}
        >
          {item.requesterAvatar ? (
            <Image source={{ uri: item.requesterAvatar }} style={styles.requestAvatar} contentFit="cover" />
          ) : (
            <View style={styles.requestAvatarFallback}>
              <Text style={styles.requestAvatarText}>
                {item.requesterName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{item.requesterName}</Text>
            <Text style={styles.requestSubtext}>wants to be your friend</Text>
          </View>
        </Pressable>
        <View style={styles.requestActions}>
          <Pressable
            style={styles.rejectBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              respondToFriendRequest(item.id, false);
            }}
            testID={`reject-${item.id}`}
          >
            <Text style={styles.rejectBtnText}>Decline</Text>
          </Pressable>
          <Pressable
            style={styles.acceptBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              respondToFriendRequest(item.id, true);
            }}
            testID={`accept-${item.id}`}
          >
            <Text style={styles.acceptBtnText}>Accept</Text>
          </Pressable>
        </View>
      </View>
    ),
    [router, respondToFriendRequest]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <Pressable
          style={styles.friendsBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/friends");
          }}
          testID="friends-nav-btn"
        >
          <Users size={18} color={Colors.dark.coral} />
          <Text style={styles.friendsBtnText}>
            {acceptedFriends.length} Friends
          </Text>
          <ChevronRight size={14} color={Colors.dark.textTertiary} />
        </Pressable>
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.coral}
            colors={[Colors.dark.coral]}
          />
        }
        ListHeaderComponent={
          pendingRequests.length > 0 ? (
            <View style={styles.requestsSection}>
              <Text style={styles.sectionTitle}>
                Friend Requests ({pendingRequests.length})
              </Text>
              {pendingRequests.map((req) => (
                <View key={req.id}>{renderFriendRequest({ item: req })}</View>
              ))}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
          ) : (
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              Like debates, add comments, and connect with friends to see activity here
            </Text>
          </View>
        }
        testID="activity-list"
      />
    </View>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: Colors.dark.text,
  },
  friendsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  friendsBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  listContent: {
    paddingBottom: 100,
  },
  requestsSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  recentHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 16,
  },
  requestCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  requestUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  requestAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surfaceHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  requestAvatarText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  requestSubtext: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    marginTop: 1,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: Colors.dark.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: Colors.dark.coral,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#fff",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 19,
  },
  activityComment: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    fontStyle: "italic" as const,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginTop: 3,
  },
  activityTypeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});

