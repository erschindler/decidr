import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Crown,
  Flame,
  Swords,
  Brain,
  Trophy,
  Medal,
  TrendingUp,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { supabase, resolveAvatarUrl } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string;
  count: number;
  percentage?: number;
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard_data"],
    queryFn: async () => {
      console.log("[Leaderboard] Fetching leaderboard data...");

      const { data: decisions, error: dErr } = await supabase
        .from("decisions")
        .select("id, created_by, ai_judgment, status, side_a_contributor, side_b_contributor");
      if (dErr) {
        console.log("[Leaderboard] Decisions fetch error:", dErr.message);
        throw new Error(dErr.message);
      }

      const { data: votes, error: vErr } = await supabase
        .from("user_votes")
        .select("user_id, decision_id, side");
      if (vErr) {
        console.log("[Leaderboard] Votes fetch error:", vErr.message);
        throw new Error(vErr.message);
      }

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url");
      if (pErr) {
        console.log("[Leaderboard] Profiles fetch error:", pErr.message);
        throw new Error(pErr.message);
      }

      const profileMap: Record<string, { name: string; avatar: string }> = {};
      const avatarPromises = (profiles ?? []).map(async (p: any) => {
        const fallback = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(p.display_name ?? "U")}&backgroundColor=FF6B6B`;
        let avatar = fallback;
        if (p.avatar_url) {
          const resolved = await resolveAvatarUrl(p.avatar_url);
          avatar = resolved || fallback;
        }
        profileMap[String(p.id)] = {
          name: String(p.display_name ?? "User"),
          avatar,
        };
      });
      await Promise.all(avatarPromises);

      const topicCounts: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (decisions ?? []).forEach((d: any) => {
        const creator = String(d.created_by ?? "");
        if (creator) {
          topicCounts[creator] = (topicCounts[creator] ?? 0) + 1;
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decidedDecisions = (decisions ?? []).filter((d: any) => d.ai_judgment !== null);
      const decisionJudgmentMap: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decidedDecisions.forEach((d: any) => {
        const judgment = d.ai_judgment as { vote?: string } | null;
        if (judgment?.vote) {
          decisionJudgmentMap[String(d.id)] = judgment.vote;
        }
      });

      const sideWins: Record<string, { wins: number; total: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decidedDecisions.forEach((d: any) => {
        const judgment = d.ai_judgment as { vote?: string } | null;
        if (!judgment?.vote) return;

        const winningSide = judgment.vote;
        const contributorA = d.side_a_contributor ? String(d.side_a_contributor) : null;
        const contributorB = d.side_b_contributor ? String(d.side_b_contributor) : null;

        if (contributorA) {
          if (!sideWins[contributorA]) sideWins[contributorA] = { wins: 0, total: 0 };
          sideWins[contributorA].total += 1;
          if (winningSide === "a") sideWins[contributorA].wins += 1;
        }
        if (contributorB) {
          if (!sideWins[contributorB]) sideWins[contributorB] = { wins: 0, total: 0 };
          sideWins[contributorB].total += 1;
          if (winningSide === "b") sideWins[contributorB].wins += 1;
        }
      });

      const aiAlignment: Record<string, { aligned: number; total: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (votes ?? []).forEach((v: any) => {
        const uId = String(v.user_id);
        const dId = String(v.decision_id);
        const side = String(v.side);
        const aiVote = decisionJudgmentMap[dId];
        if (!aiVote) return;

        if (!aiAlignment[uId]) aiAlignment[uId] = { aligned: 0, total: 0 };
        aiAlignment[uId].total += 1;
        if (side === aiVote) aiAlignment[uId].aligned += 1;
      });

      const topCreators: LeaderboardEntry[] = Object.entries(topicCounts)
        .map(([userId, count]) => ({
          userId,
          displayName: profileMap[userId]?.name ?? "User",
          avatarUrl: profileMap[userId]?.avatar ?? `https://api.dicebear.com/7.x/initials/png?seed=U&backgroundColor=FF6B6B`,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topSideWinners: LeaderboardEntry[] = Object.entries(sideWins)
        .filter(([, s]) => s.total >= 1)
        .map(([userId, s]) => ({
          userId,
          displayName: profileMap[userId]?.name ?? "User",
          avatarUrl: profileMap[userId]?.avatar ?? `https://api.dicebear.com/7.x/initials/png?seed=U&backgroundColor=FF6B6B`,
          count: s.wins,
          percentage: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count || (b.percentage ?? 0) - (a.percentage ?? 0))
        .slice(0, 10);

      const topAiAligned: LeaderboardEntry[] = Object.entries(aiAlignment)
        .filter(([, a]) => a.total >= 1)
        .map(([userId, a]) => ({
          userId,
          displayName: profileMap[userId]?.name ?? "User",
          avatarUrl: profileMap[userId]?.avatar ?? `https://api.dicebear.com/7.x/initials/png?seed=U&backgroundColor=FF6B6B`,
          count: a.aligned,
          percentage: a.total > 0 ? Math.round((a.aligned / a.total) * 100) : 0,
        }))
        .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || b.count - a.count)
        .slice(0, 10);

      console.log("[Leaderboard] Data compiled:", topCreators.length, "creators,", topSideWinners.length, "side winners,", topAiAligned.length, "ai aligned");
      return { topCreators, topSideWinners, topAiAligned };
    },
  });

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient.invalidateQueries({ queryKey: ["leaderboard_data"] });
    setTimeout(() => setRefreshing(false), 1000);
  }, [queryClient]);

  const getRankIcon = (index: number) => {
    if (index === 0) return { icon: Crown, color: "#FFD700", bg: "rgba(255, 215, 0, 0.15)" };
    if (index === 1) return { icon: Medal, color: "#C0C0C0", bg: "rgba(192, 192, 192, 0.12)" };
    if (index === 2) return { icon: Medal, color: "#CD7F32", bg: "rgba(205, 127, 50, 0.12)" };
    return null;
  };

  const renderEntry = useCallback(
    (entry: LeaderboardEntry, index: number, accentColor: string, showPercentage: boolean) => {
      const rankMeta = getRankIcon(index);
      const isCurrentUser = entry.userId === user?.id;

      return (
        <Pressable
          key={entry.userId}
          style={[
            styles.entryRow,
            isCurrentUser && styles.entryRowHighlight,
            index === 0 && { borderColor: accentColor, borderWidth: 1 },
          ]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/user/${entry.userId}`);
          }}
          testID={`leaderboard-entry-${entry.userId}`}
        >
          <View style={styles.rankSection}>
            {rankMeta ? (
              <View style={[styles.rankBadge, { backgroundColor: rankMeta.bg }]}>
                <rankMeta.icon size={14} color={rankMeta.color} />
              </View>
            ) : (
              <View style={styles.rankNumber}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
            )}
          </View>

          <Image
            source={{ uri: entry.avatarUrl }}
            style={styles.entryAvatar}
            contentFit="cover"
            cachePolicy="none"
          />

          <View style={styles.entryInfo}>
            <Text style={[styles.entryName, isCurrentUser && { color: accentColor }]} numberOfLines={1}>
              {entry.displayName}
              {isCurrentUser ? " (You)" : ""}
            </Text>
            <Text style={styles.entryDetail}>
              {showPercentage && entry.percentage !== undefined
                ? `${entry.count} wins · ${entry.percentage}% rate`
                : `${entry.count} ${entry.count === 1 ? "contribution" : "contributions"}`}
            </Text>
          </View>

          <View style={[styles.entryBadge, { backgroundColor: accentColor + "18" }]}>
            <Text style={[styles.entryBadgeText, { color: accentColor }]}>
              {showPercentage && entry.percentage !== undefined
                ? `${entry.percentage}%`
                : `${entry.count}`}
            </Text>
          </View>
        </Pressable>
      );
    },
    [user?.id, router]
  );

  const { topCreators, topSideWinners, topAiAligned } = leaderboardQuery.data ?? {
    topCreators: [],
    topSideWinners: [],
    topAiAligned: [],
  };

  if (leaderboardQuery.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.coral} />
          <Text style={styles.loadingText}>Loading the ranks...</Text>
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
          testID="leaderboard-back"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Leaderboards</Text>
        <View style={styles.topBarBtn}>
          <Trophy size={18} color={Colors.dark.gold} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.coral}
            colors={[Colors.dark.coral]}
          />
        }
      >
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: Colors.dark.coralDim }]}>
              <Flame size={20} color={Colors.dark.coral} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Debate Starters</Text>
              <Text style={styles.sectionSubtitle}>Most topics sparked</Text>
            </View>
          </View>
          {topCreators.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No debates created yet</Text>
            </View>
          ) : (
            topCreators.map((entry, i) => renderEntry(entry, i, Colors.dark.coral, false))
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: Colors.dark.cyanDim }]}>
              <Swords size={20} color={Colors.dark.cyan} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Argument Aces</Text>
              <Text style={styles.sectionSubtitle}>Most side contribution wins</Text>
            </View>
          </View>
          {topSideWinners.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No judged debates yet</Text>
            </View>
          ) : (
            topSideWinners.map((entry, i) => renderEntry(entry, i, Colors.dark.cyan, true))
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: Colors.dark.goldDim }]}>
              <Brain size={20} color={Colors.dark.gold} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Mind Melders</Text>
              <Text style={styles.sectionSubtitle}>Top AI decision alignment</Text>
            </View>
          </View>
          {topAiAligned.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No AI-judged votes yet</Text>
            </View>
          ) : (
            topAiAligned.map((entry, i) => renderEntry(entry, i, Colors.dark.gold, true))
          )}
        </View>

        <View style={styles.footer}>
          <TrendingUp size={14} color={Colors.dark.textTertiary} />
          <Text style={styles.footerText}>Updated in real-time</Text>
        </View>
      </ScrollView>
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
    color: Colors.dark.textTertiary,
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
    fontSize: 18,
    fontWeight: "800" as const,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  sectionIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.dark.textTertiary,
  },
  emptySection: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: "transparent",
  },
  entryRowHighlight: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  rankSection: {
    width: 30,
    alignItems: "center",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumber: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.textTertiary,
  },
  entryAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  entryDetail: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginTop: 1,
  },
  entryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  entryBadgeText: {
    fontSize: 13,
    fontWeight: "800" as const,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
});

