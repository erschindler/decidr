import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MessageSquare, TrendingUp, Gavel, Lock, Users, PenLine, Heart } from "lucide-react-native";
import Colors from "@/constants/colors";
import { Decision, UserVote } from "@/types/decision";
import { useSocial } from "@/providers/SocialProvider";

interface DecisionCardProps {
  decision: Decision;
  userVote?: UserVote;
}

function DecisionCardComponent({ decision, userVote }: DecisionCardProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const hasVoted = !!userVote;
  const isOpen = decision.status === "open_topic" || decision.status === "open_one_side";

  const { isLiked, getLikeCount, toggleLike, getCommentsForDecision, getProfileById } = useSocial();
  const liked = isLiked(decision.id);
  const likeCount = getLikeCount(decision.id);
  const comments = getCommentsForDecision(decision.id);
  const creatorProfile = getProfileById(decision.createdBy);

  const totalVotes = decision.totalVotes || 1;
  const percentA = Math.round((decision.votesA / totalVotes) * 100);
  const percentB = 100 - percentA;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/decision/${decision.id}`);
  }, [router, decision.id]);

  const handleLike = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
    ]).start();
    toggleLike(decision.id);
  }, [heartScale, toggleLike, decision.id]);

  const categoryInfo = getCategoryEmoji(decision.category);

  const handleCreatorPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${decision.createdBy}`);
  }, [router, decision.createdBy]);

  const getStatusBadge = () => {
    if (decision.status === "open_topic") {
      return { label: "Needs Both Sides", color: Colors.dark.gold, bg: Colors.dark.goldDim };
    }
    if (decision.status === "open_one_side") {
      return { label: "Needs Counter", color: Colors.dark.warning, bg: "rgba(245, 158, 11, 0.15)" };
    }
    return null;
  };

  const statusBadge = getStatusBadge();

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      testID={`decision-card-${decision.id}`}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }, isOpen && styles.cardOpen]}>
        <Pressable
          style={styles.creatorRow}
          onPress={handleCreatorPress}
          hitSlop={4}
          testID={`creator-${decision.id}`}
        >
          <Image
            source={{ uri: creatorProfile.avatar }}
            style={styles.creatorAvatar}
            contentFit="cover"
            cachePolicy="none"
          />
          <Text style={styles.creatorName} numberOfLines={1}>{creatorProfile.name}</Text>
          <Text style={styles.creatorDot}>·</Text>
          <Text style={styles.creatorTime}>{getRelativeTime(decision.createdAt)}</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryEmoji}>{categoryInfo}</Text>
            </View>
            {statusBadge && (
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <PenLine size={10} color={statusBadge.color} />
                <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                  {statusBadge.label}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.statsRow}>
            {isOpen ? (
              <>
                <Users size={12} color={Colors.dark.textTertiary} />
                <Text style={styles.statsText}>Open</Text>
              </>
            ) : (
              <>
                <TrendingUp size={12} color={Colors.dark.textTertiary} />
                <Text style={styles.statsText}>{decision.totalVotes} votes</Text>
              </>
            )}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {decision.title}
        </Text>

        {isOpen ? (
          <View style={styles.openSidesContainer}>
            <View style={[styles.openSideSlot, decision.sideA ? styles.openSideFilled : styles.openSideEmpty]}>
              <View style={[styles.sideIndicator, { backgroundColor: Colors.dark.coral }]} />
              <View style={styles.sideContent}>
                {decision.sideA ? (
                  <>
                    <Text style={styles.sideLabel}>Side A</Text>
                    <Text style={styles.sideTitle} numberOfLines={1}>
                      {decision.sideA.title}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sideLabel}>Side A</Text>
                    <Text style={styles.emptySlotText}>Waiting for argument...</Text>
                  </>
                )}
              </View>
            </View>

            <View style={[styles.openSideSlot, decision.sideB ? styles.openSideFilled : styles.openSideEmpty]}>
              <View style={[styles.sideIndicator, { backgroundColor: Colors.dark.cyan }]} />
              <View style={styles.sideContent}>
                {decision.sideB ? (
                  <>
                    <Text style={styles.sideLabel}>Side B</Text>
                    <Text style={styles.sideTitle} numberOfLines={1}>
                      {decision.sideB.title}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sideLabel}>Side B</Text>
                    <Text style={styles.emptySlotText}>Waiting for argument...</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.sidesContainer}>
            <View style={[styles.sideCard, styles.sideA]}>
              <View style={[styles.sideIndicator, { backgroundColor: Colors.dark.coral }]} />
              <View style={styles.sideContent}>
                <Text style={styles.sideLabel}>Side A</Text>
                <Text style={styles.sideTitle} numberOfLines={1}>
                  {decision.sideA?.title ?? ""}
                </Text>
              </View>
              {hasVoted && (
                <Text style={[styles.percent, { color: Colors.dark.coral }]}>{percentA}%</Text>
              )}
            </View>

            <View style={[styles.sideCard, styles.sideB]}>
              <View style={[styles.sideIndicator, { backgroundColor: Colors.dark.cyan }]} />
              <View style={styles.sideContent}>
                <Text style={styles.sideLabel}>Side B</Text>
                <Text style={styles.sideTitle} numberOfLines={1}>
                  {decision.sideB?.title ?? ""}
                </Text>
              </View>
              {hasVoted && (
                <Text style={[styles.percent, { color: Colors.dark.cyan }]}>{percentB}%</Text>
              )}
            </View>
          </View>
        )}

        {hasVoted && !isOpen && (
          <View style={styles.voteBar}>
            <View style={[styles.voteBarA, { flex: percentA }]} />
            <View style={[styles.voteBarB, { flex: percentB }]} />
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {isOpen ? (
              <View style={styles.contributeHint}>
                <PenLine size={13} color={Colors.dark.coral} />
                <Text style={styles.contributeHintText}>Tap to contribute</Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={styles.likeBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleLike();
                  }}
                  hitSlop={6}
                  testID={`like-btn-${decision.id}`}
                >
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Heart
                      size={15}
                      color={liked ? "#FF4B6E" : Colors.dark.textTertiary}
                      fill={liked ? "#FF4B6E" : "none"}
                    />
                  </Animated.View>
                  {likeCount > 0 && (
                    <Text style={[styles.likeCount, liked && styles.likeCountActive]}>
                      {likeCount}
                    </Text>
                  )}
                </Pressable>
                <View style={styles.commentCount}>
                  <MessageSquare size={13} color={Colors.dark.textTertiary} />
                  <Text style={styles.footerText}>
                    {comments.length + decision.justifications.length}
                  </Text>
                </View>
              </>
            )}
          </View>
          {!isOpen && (
            <View style={styles.aiIndicator}>
              {decision.aiJudgment && !hasVoted ? (
                <>
                  <Lock size={12} color={Colors.dark.gold} />
                  <Text style={styles.aiLockedText}>AI Judge locked</Text>
                </>
              ) : decision.aiJudgment && hasVoted ? (
                <>
                  <Gavel size={12} color={Colors.dark.gold} />
                  <Text style={styles.aiReadyText}>AI judged</Text>
                </>
              ) : decision.aiPending ? (
                <Text style={styles.aiPendingText}>AI analyzing...</Text>
              ) : null}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

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

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    food: "🍕",
    lifestyle: "✨",
    tech: "💻",
    politics: "🏛️",
    entertainment: "🎬",
    sports: "⚽",
    relationships: "💬",
    finance: "💰",
    health: "🏃",
    random: "🎲",
  };
  return map[category] || "🎲";
}

export const DecisionCard = React.memo(DecisionCardComponent, (prev, next) => {
  return (
    prev.decision.id === next.decision.id &&
    prev.decision.totalVotes === next.decision.totalVotes &&
    prev.decision.aiPending === next.decision.aiPending &&
    prev.decision.status === next.decision.status &&
    prev.decision.justifications.length === next.decision.justifications.length &&
    prev.userVote?.side === next.userVote?.side
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  creatorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  creatorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.text,
    flexShrink: 1,
  },
  creatorDot: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
  creatorTime: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
  cardOpen: {
    borderColor: Colors.dark.borderLight,
    borderStyle: "dashed" as const,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: Colors.dark.surfaceHighlight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statsText: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
    fontWeight: "500" as const,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 12,
    lineHeight: 24,
  },
  sidesContainer: {
    gap: 6,
    marginBottom: 10,
  },
  openSidesContainer: {
    gap: 6,
    marginBottom: 10,
  },
  sideCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    overflow: "hidden",
  },
  openSideSlot: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
  },
  openSideFilled: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
  openSideEmpty: {
    backgroundColor: Colors.dark.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: "dashed" as const,
  },
  sideA: {},
  sideB: {},
  sideIndicator: {
    width: 4,
    alignSelf: "stretch",
  },
  sideContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sideLabel: {
    color: Colors.dark.textTertiary,
    fontSize: 10,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  sideTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "600" as const,
    marginTop: 2,
  },
  emptySlotText: {
    color: Colors.dark.textTertiary,
    fontSize: 13,
    fontStyle: "italic" as const,
    marginTop: 2,
  },
  percent: {
    fontSize: 16,
    fontWeight: "800" as const,
    paddingRight: 12,
  },
  voteBar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 10,
  },
  voteBarA: {
    backgroundColor: Colors.dark.coral,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  voteBarB: {
    backgroundColor: Colors.dark.cyan,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeCount: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  likeCountActive: {
    color: "#FF4B6E",
  },
  commentCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  contributeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  contributeHintText: {
    color: Colors.dark.coral,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  aiIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  aiLockedText: {
    color: Colors.dark.gold,
    fontSize: 11,
    fontWeight: "600" as const,
  },
  aiReadyText: {
    color: Colors.dark.gold,
    fontSize: 11,
    fontWeight: "600" as const,
  },
  aiPendingText: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    fontStyle: "italic" as const,
  },
});
