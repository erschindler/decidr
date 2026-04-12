import React, { useState, useCallback } from "react";
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
import { Search, TrendingUp, Trophy } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useRouter } from "expo-router";
import { useTrendingDecisions, useFilteredDecisions, useDecisions } from "@/providers/DecisionProvider";
import { DecisionCard } from "@/components/DecisionCard";
import { BannerAd } from "@/components/BannerAd";
import { Category, CATEGORIES, Decision } from "@/types/decision";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const trending = useTrendingDecisions();
  const filtered = useFilteredDecisions(selectedCategory, search);
  const { refreshAll } = useDecisions();

  const showTrending = !search.trim() && selectedCategory === "all";
  const displayData = showTrending ? trending : filtered;

  const { getUserVote } = useDecisions();

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
        <TrendingUp size={16} color={Colors.dark.coral} />
        <Text style={styles.listHeaderText}>
          {showTrending ? "Trending Debates" : `Results (${displayData.length})`}
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
    marginBottom: 16,
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

