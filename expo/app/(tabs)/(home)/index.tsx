import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Search, Plus, Flame, Clock } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDecisions, useFilteredDecisions } from "@/providers/DecisionProvider";
import { DecisionCard } from "@/components/DecisionCard";
import { BannerAd } from "@/components/BannerAd";
import { Category, CATEGORIES, Decision } from "@/types/decision";

type SortMode = "trending" | "newest";

export default function HomeFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoading, refreshAll } = useDecisions();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("trending");
  const [refreshing, setRefreshing] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  const filtered = useFilteredDecisions(selectedCategory, search);

  const sorted = React.useMemo(() => {
    if (sortMode === "trending") {
      return [...filtered].sort((a, b) => b.totalVotes - a.totalVotes);
    }
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filtered, sortMode]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log("[Home] Pull to refresh triggered");
    refreshAll();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshAll]);

  const handleFabPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/create");
  }, [router]);

  const handleFabPressIn = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [fabScale]);

  const handleFabPressOut = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  }, [fabScale]);

  const { getUserVote } = useDecisions();

  const renderItem = useCallback(
    ({ item }: { item: Decision }) => (
      <DecisionCard decision={item} userVote={getUserVote(item.id)} />
    ),
    [getUserVote]
  );

  const keyExtractor = useCallback((item: Decision) => item.id, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.coral} />
          <Text style={styles.loadingText}>Loading debates...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>Decidr</Text>
        <View style={styles.sortToggle}>
          <Pressable
            style={[styles.sortBtn, sortMode === "trending" && styles.sortBtnActive]}
            onPress={() => {
              setSortMode("trending");
              void Haptics.selectionAsync();
            }}
            testID="sort-trending"
          >
            <Flame size={14} color={sortMode === "trending" ? Colors.dark.coral : Colors.dark.textTertiary} />
            <Text style={[styles.sortBtnText, sortMode === "trending" && styles.sortBtnTextActive]}>
              Hot
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sortBtn, sortMode === "newest" && styles.sortBtnActive]}
            onPress={() => {
              setSortMode("newest");
              void Haptics.selectionAsync();
            }}
            testID="sort-newest"
          >
            <Clock size={14} color={sortMode === "newest" ? Colors.dark.coral : Colors.dark.textTertiary} />
            <Text style={[styles.sortBtnText, sortMode === "newest" && styles.sortBtnTextActive]}>
              New
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={16} color={Colors.dark.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search debates..."
          placeholderTextColor={Colors.dark.textTertiary}
          value={search}
          onChangeText={setSearch}
          testID="search-input"
        />
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: "all" as const, label: "All", emoji: "🔥" }, ...CATEGORIES]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipActive,
              ]}
              onPress={() => {
                setSelectedCategory(item.id as Category | "all");
                void Haptics.selectionAsync();
              }}
              testID={`category-${item.id}`}
            >
              <Text style={styles.categoryChipEmoji}>{item.emoji}</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item.id && styles.categoryChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <BannerAd placement="home" />

      <FlatList
        data={sorted}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
            <Text style={styles.emptyEmoji}>🤔</Text>
            <Text style={styles.emptyTitle}>No debates found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? "Try a different search" : "Be the first to start one!"}
            </Text>
          </View>
        }
        testID="decisions-list"
      />

      <Pressable
        onPress={handleFabPress}
        onPressIn={handleFabPressIn}
        onPressOut={handleFabPressOut}
        testID="create-fab"
      >
        <Animated.View
          style={[
            styles.fab,
            {
              transform: [{ scale: fabScale }],
              bottom: Platform.OS === "ios" ? 16 : 16,
            },
          ]}
        >
          <Plus size={28} color="#fff" strokeWidth={2.5} />
        </Animated.View>
      </Pressable>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: "500" as const,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  sortToggle: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortBtnActive: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  sortBtnTextActive: {
    color: Colors.dark.coral,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
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
  categoriesContainer: {
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.dark.coralDim,
    borderColor: Colors.dark.coral,
  },
  categoryChipEmoji: {
    fontSize: 13,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.dark.coral,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.coral,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.dark.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});

