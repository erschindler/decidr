import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Search, Trophy } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useRouter } from "expo-router";
import { useSortedDecisions, useDecisions, DiscoverySort } from "@/providers/DecisionProvider";
import { useFriendDebates } from "@/providers/SocialProvider";
import { DecisionCard } from "@/components/DecisionCard";
import { BannerAd } from "@/components/BannerAd";
import { Category, CATEGORIES, Decision } from "@/types/decision";

type FeedId = DiscoverySort | "friends";

const FEEDS: { id: FeedId; label: string; emoji: string }[] = [
  { id: "new", label: "New", emoji: "🆕" },
  { id: "trending", label: "Trending", emoji: "🔥" },
  { id: "most_voted", label: "Most Voted", emoji: "🗳️" },
  { id: "most_divided", label: "Most Divided", emoji: "⚖️" },
  { id: "popular", label: "Popular", emoji: "⭐" },
  { id: "friends", label: "Friends", emoji: "👥" },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [activeFeed, setActiveFeed] = useState<FeedId>("trending");
  const [refreshing, setRefreshing] = useState(false);

  const { refreshAll, getUserVote } = useDecisions();
  const sorted = useSortedDecisions(activeFeed === "friends" ? "new" : activeFeed);
  const friendDebates = useFriendDebates();

  const source = activeFeed === "friends" ? friendDebates : sorted;

  // Category + search always compose on top of the active feed
  // (e.g. Gaming → Trending, Politics → Most Divided).
  const displayData = useMemo(() => {
    let list = source;
    if (selectedCategory !== "all") {
      list = list.filter((d) => d.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.sideA?.title.toLowerCase().includes(q) ?? false) ||
          (d.sideB?.title.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [source, selectedCategory, search]);

  const isFiltering = !!search.trim() || selectedCategory !== "all";
  const activeFeedLabel = FEEDS.find((f) => f.id === activeFeed)?.label ?? "Trending";

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    console.log("[Discover] Pull to refresh");
    refreshAll();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshAll]);

  const renderItem = useCallback(
    ({ item }: { item: Decision }) => (
      <DecisionCard decision={item} userVote={getUserVote(item.id)} />
    ),
    [getUserVote]
  );

  const renderFeedChip = useCallback(({ item }: { item: { id: FeedId; label: string; emoji: string } }) => {
    const active = activeFeed === item.id;
    return (
      <Pressable
        style={[styles.feedChip, active && styles.feedChipActive]}
        onPress={() => {
          setActiveFeed(item.id);
          void Haptics.selectionAsync();
        }}
        testID={`discover-feed-${item.id}`}
      >
        <Text style={styles.feedChipEmoji}>{item.emoji}</Text>
        <Text style={[styles.feedChipText, active && styles.feedChipTextActive]}>{item.label}</Text>
      </Pressable>
    );
  }, [activeFeed]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Pressable
          style={styles.leaderboardBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/leaderboard");
          }}
          testID="discover-leaderboard-btn"
        >
          <Trophy size={16} color={Colors.dark.gold} />
          <Text style={styles.leaderboardBtnText}>Rankings</Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Search size={16} color={Colors.dark.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search all debates..."
          placeholderTextColor={Colors.dark.textTertiary}
          value={search}
          onChangeText={setSearch}
          testID="discover-search-input"
        />
      </View>

      <View style={styles.feedsSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FEEDS}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedChip}
          contentContainerStyle={styles.feedsRow}
          testID="discover-feeds-row"
        />
      </View>

      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Browse by Category</Text>
        <View style={styles.categoryGrid}>
          <Pressable
            style={[
              styles.categoryCard,
              selectedCategory === "all" && styles.categoryCardActive,
            ]}
            onPress={() => {
              setSelectedCategory("all");
              void Haptics.selectionAsync();
            }}
            testID="discover-category-all"
          >
            <Text style={styles.categoryCardEmoji}>🔥</Text>
            <Text
              style={[
                styles.categoryCardText,
                selectedCategory === "all" && styles.categoryCardTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryCard,
                selectedCategory === cat.id && styles.categoryCardActive,
              ]}
              onPress={() => {
                setSelectedCategory(cat.id);
                void Haptics.selectionAsync();
              }}
              testID={`discover-category-${cat.id}`}
            >
              <Text style={styles.categoryCardEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryCardText,
                  selectedCategory === cat.id && styles.categoryCardTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <BannerAd placement="discover" />

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {isFiltering ? `Results (${displayData.length})` : `${activeFeedLabel} Debates`}
        </Text>
      </View>

      <FlatList
        data={displayData}
        renderItem={renderItem}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptySubtitle}>Try a different search or category</Text>
          </View>
        }
        testID="discover-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: Colors.dark.text,
  },
  leaderboardBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.dark.goldDim,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 217, 61, 0.25)",
  },
  leaderboardBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
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
  feedsSection: {
    marginBottom: 14,
  },
  feedsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  feedChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  feedChipActive: {
    backgroundColor: Colors.dark.coralDim,
    borderColor: Colors.dark.coral,
  },
  feedChipEmoji: {
    fontSize: 13,
  },
  feedChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  feedChipTextActive: {
    color: Colors.dark.coral,
  },
  categoriesSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryCardActive: {
    backgroundColor: Colors.dark.coralDim,
    borderColor: Colors.dark.coral,
  },
  categoryCardEmoji: {
    fontSize: 14,
  },
  categoryCardText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  categoryCardTextActive: {
    color: Colors.dark.coral,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listHeaderText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
});
