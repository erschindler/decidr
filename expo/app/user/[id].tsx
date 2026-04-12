import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  Clock,
  UserMinus,
  BarChart3,
  Target,
  Brain,
  XCircle,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { supabase, resolveAvatarUrl } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useDecisions } from "@/providers/DecisionProvider";
import { useSocial } from "@/providers/SocialProvider";
import { DecisionCard } from "@/components/DecisionCard";
import { Decision } from "@/types/decision";

export default function UserProfileScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { decisions, getUserVote } = useDecisions();
  const { getFriendshipWith, sendFriendRequest, respondToFriendRequest, removeFriend, isSendingFriendRequest } = useSocial();

  const isOwnProfile = user?.id === userId;

  const profileQuery = useQuery({
    queryKey: ["user-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      console.log("[UserProfile] Fetching profile for:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.log("[UserProfile] Profile not found, using fallback");
        return {
          id: userId,
          name: "User",
          avatar: `https://api.dicebear.com/7.x/initials/png?seed=U&backgroundColor=FF6B6B`,
          decisionsCreated: 0,
          votesCast: 0,
          aiAlignmentRate: 0,
        };
      }

      const fallbackAvatar = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(data.display_name ?? "U")}&backgroundColor=FF6B6B`;
      const resolvedAvatar = data.avatar_url ? await resolveAvatarUrl(data.avatar_url) : fallbackAvatar;
      return {
        id: String(data.id),
        name: String(data.display_name ?? "User"),
        avatar: resolvedAvatar || fallbackAvatar,
        decisionsCreated: Number(data.decisions_created ?? 0),
        votesCast: Number(data.votes_cast ?? 0),
        aiAlignmentRate: Number(data.ai_alignment_rate ?? 0),
      };
    },
  });

  const profile = profileQuery.data;
  const friendship = getFriendshipWith(userId ?? "");

  const userDecisions = useMemo(
    () => decisions.filter((d) => d.createdBy === userId),
    [decisions, userId]
  );

  const handleFriendAction = useCallback(() => {
    if (!userId || !profile || isOwnProfile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!friendship) {
      console.log("[UserProfile] Sending friend request to:", userId);
      sendFriendRequest(userId, profile.name, profile.avatar);
    } else if (friendship.status === "pending" && friendship.recipientId === user?.id) {
      Alert.alert(
        "Friend Request",
        `Accept friend request from ${profile.name}?`,
        [
          { text: "Decline", style: "destructive", onPress: () => respondToFriendRequest(friendship.id, false) },
          { text: "Accept", onPress: () => respondToFriendRequest(friendship.id, true) },
        ]
      );
    } else if (friendship.status === "pending" && friendship.requesterId === user?.id) {
      Alert.alert(
        "Cancel Request",
        `Cancel friend request to ${profile.name}?`,
        [
          { text: "Keep", style: "cancel" },
          { text: "Cancel Request", style: "destructive", onPress: () => removeFriend(friendship.id) },
        ]
      );
    } else if (friendship.status === "accepted") {
      Alert.alert(
        "Remove Friend",
        `Remove ${profile.name} from your friends?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: () => removeFriend(friendship.id) },
        ]
      );
    }
  }, [userId, profile, friendship, isOwnProfile, user?.id, sendFriendRequest, respondToFriendRequest, removeFriend]);

  const renderItem = useCallback(
    ({ item }: { item: Decision }) => (
      <DecisionCard decision={item} userVote={getUserVote(item.id)} />
    ),
    [getUserVote]
  );

  const getFriendButtonConfig = () => {
    if (isSendingFriendRequest && !friendship) {
      return { label: "Sending...", icon: Clock, color: Colors.dark.textTertiary, bg: Colors.dark.surface };
    }
    if (!friendship) {
      return { label: "Add Friend", icon: UserPlus, color: Colors.dark.coral, bg: Colors.dark.coralDim };
    }
    if (friendship.status === "pending" && friendship.requesterId === user?.id) {
      return { label: "Request Sent", icon: Clock, color: Colors.dark.textTertiary, bg: Colors.dark.surface };
    }
    if (friendship.status === "pending" && friendship.recipientId === user?.id) {
      return { label: "Respond", icon: UserPlus, color: Colors.dark.gold, bg: Colors.dark.goldDim };
    }
    if (friendship.status === "accepted") {
      return { label: "Friends", icon: UserCheck, color: Colors.dark.success, bg: "rgba(34, 197, 94, 0.12)" };
    }
    return { label: "Add Friend", icon: UserPlus, color: Colors.dark.coral, bg: Colors.dark.coralDim };
  };

  const friendBtn = getFriendButtonConfig();

  if (profileQuery.isLoading || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.coral} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.topBarBtn}
          testID="user-profile-back"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {profile.name}
        </Text>
        <View style={styles.topBarBtn} />
      </View>

      <FlatList
        data={userDecisions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.profileSection}>
            <View style={styles.avatarSection}>
              <Image
                source={{ uri: profile.avatar }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="none"
              />
              <Text style={styles.name}>{profile.name}</Text>
            </View>

            {!isOwnProfile && (
              <Pressable
                style={[styles.friendBtn, { backgroundColor: friendBtn.bg, opacity: isSendingFriendRequest ? 0.7 : 1 }]}
                onPress={handleFriendAction}
                disabled={isSendingFriendRequest}
                testID="friend-action-btn"
              >
                <friendBtn.icon size={16} color={friendBtn.color} />
                <Text style={[styles.friendBtnText, { color: friendBtn.color }]}>
                  {friendBtn.label}
                </Text>
              </Pressable>
            )}

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.coralDim }]}>
                  <BarChart3 size={18} color={Colors.dark.coral} />
                </View>
                <Text style={styles.statValue}>{profile.decisionsCreated}</Text>
                <Text style={styles.statLabel}>Created</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.cyanDim }]}>
                  <Target size={18} color={Colors.dark.cyan} />
                </View>
                <Text style={styles.statValue}>{profile.votesCast}</Text>
                <Text style={styles.statLabel}>Votes</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.goldDim }]}>
                  <Brain size={18} color={Colors.dark.gold} />
                </View>
                <Text style={styles.statValue}>{profile.aiAlignmentRate}%</Text>
                <Text style={styles.statLabel}>AI Aligned</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Decisions</Text>
              <Text style={styles.sectionCount}>{userDecisions.length}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No decisions yet</Text>
          </View>
        }
        testID="user-decisions-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 100,
  },
  profileSection: {},
  avatarSection: {
    alignItems: "center",
    paddingVertical: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.dark.coral,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  friendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 60,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  friendBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textTertiary,
  },
});

