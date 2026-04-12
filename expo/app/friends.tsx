import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Search,
  UserMinus,
  MessageSquare,
  Clock,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useSocial } from "@/providers/SocialProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Friendship } from "@/types/social";

function useFriendProfile(friendship: Friendship, currentUserId: string | undefined) {
  const { getProfileById } = useSocial();
  const isRequester = friendship.requesterId === currentUserId;
  const friendId = isRequester ? friendship.recipientId : friendship.requesterId;
  const cached = getProfileById(friendId);
  return {
    friendId,
    friendName: cached.name,
    friendAvatar: cached.avatar,
  };
}

function FriendRow({ item, userId, router, onRemove }: { item: Friendship; userId: string | undefined; router: ReturnType<typeof useRouter>; onRemove: (f: Friendship) => void }) {
  const { friendId, friendName, friendAvatar } = useFriendProfile(item, userId);
  return (
    <Pressable
      style={styles.friendRow}
      onPress={() => router.push(`/user/${friendId}`)}
      testID={`friend-${friendId}`}
    >
      {friendAvatar ? (
        <Image
          source={{ uri: friendAvatar }}
          style={styles.friendAvatar}
          contentFit="cover"
          cachePolicy="none"
        />
      ) : (
        <View style={styles.friendAvatarFallback}>
          <Text style={styles.friendAvatarText}>
            {friendName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friendName}</Text>
        <Text style={styles.friendSince}>
          Friends since {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable
        style={styles.removeBtn}
        onPress={() => onRemove(item)}
        hitSlop={8}
        testID={`remove-friend-${friendId}`}
      >
        <UserMinus size={16} color={Colors.dark.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

function SentRequestRow({ item, userId }: { item: Friendship; userId: string | undefined }) {
  const { getProfileById } = useSocial();
  const recipientProfile = getProfileById(item.recipientId);
  return (
    <View style={styles.sentRow}>
      {recipientProfile.avatar ? (
        <Image
          source={{ uri: recipientProfile.avatar }}
          style={styles.friendAvatar}
          contentFit="cover"
          cachePolicy="none"
        />
      ) : (
        <View style={styles.friendAvatarFallback}>
          <Text style={styles.friendAvatarText}>
            {recipientProfile.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{recipientProfile.name}</Text>
        <View style={styles.pendingBadge}>
          <Clock size={10} color={Colors.dark.textTertiary} />
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      </View>
    </View>
  );
}

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { acceptedFriends, sentRequests, removeFriend } = useSocial();
  const [search, setSearch] = useState("");

  const filteredFriends = acceptedFriends.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const friendName =
      f.requesterId === user?.id ? f.recipientName : f.requesterName;
    return friendName.toLowerCase().includes(q);
  });

  const handleRemoveFriend = useCallback(
    (friendship: Friendship) => {
      const friendName =
        friendship.requesterId === user?.id
          ? friendship.recipientName
          : friendship.requesterName;
      Alert.alert(
        "Remove Friend",
        `Remove ${friendName} from your friends?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              removeFriend(friendship.id);
            },
          },
        ]
      );
    },
    [user?.id, removeFriend]
  );

  const renderFriend = useCallback(
    ({ item }: { item: Friendship }) => (
      <FriendRow item={item} userId={user?.id} router={router} onRemove={handleRemoveFriend} />
    ),
    [user?.id, router, handleRemoveFriend]
  );

  const renderSentRequest = useCallback(
    ({ item }: { item: Friendship }) => (
      <SentRequestRow item={item} userId={user?.id} />
    ),
    [user?.id]
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
          style={styles.topBarBtn}
          testID="friends-back"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Friends</Text>
        <View style={styles.topBarBtn} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={16} color={Colors.dark.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor={Colors.dark.textTertiary}
          value={search}
          onChangeText={setSearch}
          testID="friends-search"
        />
      </View>

      <FlatList
        data={filteredFriends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          sentRequests.length > 0 ? (
            <View style={styles.sentSection}>
              <Text style={styles.sectionTitle}>Sent Requests</Text>
              {sentRequests.map((req) => (
                <View key={req.id}>{renderSentRequest({ item: req })}</View>
              ))}
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>
                Friends ({filteredFriends.length})
              </Text>
            </View>
          ) : (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Friends ({filteredFriends.length})
              </Text>
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptySubtitle}>
              Visit other users' profiles to add them as friends
            </Text>
          </View>
        }
        testID="friends-list"
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingBottom: 100,
  },
  sentSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
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
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 16,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  sentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.surfaceHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  friendSince: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  pendingText: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
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

