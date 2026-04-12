import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Share2,
  Gavel,
  Lock,
  Check,
  MessageSquare,
  Brain,
  ChevronRight,
  Sparkles,
  PenLine,
  Users,
  Heart,
  Send,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDecisions } from "@/providers/DecisionProvider";
import { useSocial, useDecisionComments } from "@/providers/SocialProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function DecisionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getDecision, getUserVote, castVote, profile } = useDecisions();
  const { isLiked, getLikeCount, toggleLike, addComment, isAddingComment, getProfileById } = useSocial();
  const { user } = useAuth();
  const comments = useDecisionComments(id ?? "");

  const decision = getDecision(id ?? "");
  const userVote = getUserVote(id ?? "");
  const hasVoted = !!userVote;
  const isOpen = decision?.status === "open_topic" || decision?.status === "open_one_side";

  const creatorProfile = decision ? getProfileById(decision.createdBy) : null;
  const sideAContributorProfile = decision?.sideAContributor ? getProfileById(decision.sideAContributor) : null;
  const sideBContributorProfile = decision?.sideBContributor ? getProfileById(decision.sideBContributor) : null;

  const liked = isLiked(id ?? "");
  const likeCount = getLikeCount(id ?? "");

  const [justification, setJustification] = useState("");
  const [showJustificationInput, setShowJustificationInput] = useState(false);
  const [pendingVote, setPendingVote] = useState<"a" | "b" | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const [aiRevealed, setAiRevealed] = useState(hasVoted);
  const [newComment, setNewComment] = useState("");

  const voteBarWidthA = useRef(new Animated.Value(hasVoted ? 1 : 0)).current;
  const voteBarWidthB = useRef(new Animated.Value(hasVoted ? 1 : 0)).current;
  const aiRevealScale = useRef(new Animated.Value(hasVoted ? 1 : 0)).current;
  const aiRevealOpacity = useRef(new Animated.Value(hasVoted ? 1 : 0)).current;
  const gavelRotation = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log("[Detail] Decision loaded:", id, "hasVoted:", hasVoted, "isOpen:", isOpen);
  }, [id, hasVoted, isOpen]);

  useEffect(() => {
    if (hasVoted && decision) {
      const total = decision.totalVotes || 1;
      const pA = decision.votesA / total;
      const pB = decision.votesB / total;

      if (justVoted) {
        console.log("[Detail] Just voted, animating bars:", pA, pB);
        Animated.parallel([
          Animated.spring(voteBarWidthA, {
            toValue: pA,
            useNativeDriver: false,
            speed: 8,
            bounciness: 4,
          }),
          Animated.spring(voteBarWidthB, {
            toValue: pB,
            useNativeDriver: false,
            speed: 8,
            bounciness: 4,
          }),
        ]).start();

        if (!aiRevealed && decision.aiJudgment) {
          setTimeout(() => {
            setAiRevealed(true);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Animated.sequence([
              Animated.parallel([
                Animated.spring(aiRevealScale, {
                  toValue: 1,
                  useNativeDriver: true,
                  speed: 6,
                  bounciness: 12,
                }),
                Animated.timing(aiRevealOpacity, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(gavelRotation, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(gavelRotation, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(confettiOpacity, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(confettiOpacity, {
                  toValue: 0,
                  duration: 800,
                  useNativeDriver: true,
                }),
              ]),
            ]).start();
          }, 600);
        }
      } else {
        voteBarWidthA.setValue(pA);
        voteBarWidthB.setValue(pB);
        setAiRevealed(true);
        aiRevealScale.setValue(1);
        aiRevealOpacity.setValue(1);
      }
    }
  }, [hasVoted, decision, aiRevealed, justVoted, voteBarWidthA, voteBarWidthB, aiRevealScale, aiRevealOpacity, gavelRotation, confettiOpacity]);

  const handleVote = useCallback(
    (side: "a" | "b") => {
      if (hasVoted) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      console.log("[Detail] Vote initiated for side:", side);
      setPendingVote(side);
      setShowJustificationInput(true);
    },
    [hasVoted]
  );

  const submitVote = useCallback(() => {
    if (!pendingVote || !id) return;
    console.log("[Detail] Submitting vote:", pendingVote, "with justification:", justification.trim() ? "yes" : "no");
    setJustVoted(true);
    void castVote(id, pendingVote, justification.trim() || undefined);
    setShowJustificationInput(false);
    setJustification("");
    setPendingVote(null);
  }, [pendingVote, id, justification, castVote]);

  const skipJustification = useCallback(() => {
    if (!pendingVote || !id) return;
    console.log("[Detail] Skipping justification, submitting vote:", pendingVote);
    setJustVoted(true);
    void castVote(id, pendingVote);
    setShowJustificationInput(false);
    setPendingVote(null);
  }, [pendingVote, id, castVote]);

  const handleLike = useCallback(() => {
    if (!id) return;
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
    toggleLike(id);
  }, [id, heartScale, toggleLike]);

  const handleAddComment = useCallback(() => {
    if (!id || !newComment.trim()) return;
    console.log("[Detail] Adding comment:", newComment.trim().slice(0, 30));
    addComment(id, newComment.trim());
    setNewComment("");
  }, [id, newComment, addComment]);

  const gavelSpin = gavelRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-30deg"],
  });

  if (!decision) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorText}>Decision not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton} testID="error-back-btn">
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const totalVotes = decision.totalVotes || 1;
  const percentA = Math.round((decision.votesA / totalVotes) * 100);
  const percentB = 100 - percentA;
  const totalComments = comments.length + decision.justifications.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.topBarBtn}
          testID="detail-back-button"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {decision.title}
        </Text>
        <Pressable style={styles.topBarBtn} testID="detail-share-button">
          <Share2 size={20} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.creatorRow}
          onPress={() => {
            if (creatorProfile) {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/user/${decision.createdBy}`);
            }
          }}
          testID="detail-creator"
        >
          {creatorProfile && (
            <Image
              source={{ uri: creatorProfile.avatar }}
              style={styles.creatorAvatar}
              contentFit="cover"
              cachePolicy="none"
            />
          )}
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{creatorProfile?.name ?? "User"}</Text>
            <Text style={styles.creatorTime}>{getRelativeTime(decision.createdAt)}</Text>
          </View>
        </Pressable>

        <Text style={styles.title}>{decision.title}</Text>

        <View style={styles.engagementRow}>
          <Pressable style={styles.likeRow} onPress={handleLike} hitSlop={8} testID="detail-like-btn">
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                size={18}
                color={liked ? "#FF4B6E" : Colors.dark.textTertiary}
                fill={liked ? "#FF4B6E" : "none"}
              />
            </Animated.View>
            <Text style={[styles.engagementText, liked && styles.engagementTextActive]}>
              {likeCount > 0 ? likeCount : "Like"}
            </Text>
          </Pressable>

          <View style={styles.engagementDivider} />

          <View style={styles.commentCountRow}>
            <MessageSquare size={16} color={Colors.dark.textTertiary} />
            <Text style={styles.engagementText}>{totalComments} comments</Text>
          </View>

          {!isOpen && (
            <>
              <View style={styles.engagementDivider} />
              <View style={styles.voteCountRow}>
                <Text style={styles.engagementText}>{decision.totalVotes} votes</Text>
              </View>
            </>
          )}
        </View>

        {isOpen ? (
          <View style={styles.openStatusRow}>
            <Users size={14} color={Colors.dark.gold} />
            <Text style={styles.openStatusText}>
              {decision.status === "open_topic"
                ? "This topic needs both sides — be the first to contribute!"
                : "One side is in — add the counter-argument to start the vote!"}
            </Text>
          </View>
        ) : null}

        <View style={styles.sidesSection}>
          {decision.sideA ? (
            <View style={[styles.sideBox, styles.sideBoxA, userVote?.side === "a" && styles.sideBoxVoted]}>
              <View style={styles.sideHeader}>
                <View style={[styles.sideBadge, { backgroundColor: Colors.dark.coralDim }]}>
                  <Text style={[styles.sideBadgeText, { color: Colors.dark.coral }]}>SIDE A</Text>
                </View>
                {userVote?.side === "a" && (
                  <View style={styles.yourVoteBadge}>
                    <Check size={10} color={Colors.dark.coral} />
                    <Text style={styles.yourVoteText}>Your vote</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sideTitle}>{decision.sideA.title}</Text>
              <Text style={styles.sideArgument}>{decision.sideA.argument}</Text>

              {sideAContributorProfile && (
                <Pressable
                  style={styles.contributorRow}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/user/${decision.sideAContributor}`);
                  }}
                  hitSlop={4}
                >
                  <Image
                    source={{ uri: sideAContributorProfile.avatar }}
                    style={styles.contributorAvatar}
                    contentFit="cover"
                    cachePolicy="none"
                  />
                  <Text style={styles.contributorName}>by {sideAContributorProfile.name}</Text>
                </Pressable>
              )}

              {hasVoted && (
                <View style={styles.voteResult}>
                  <View style={styles.voteBarTrack}>
                    <Animated.View
                      style={[
                        styles.voteBarFill,
                        {
                          backgroundColor: Colors.dark.coral,
                          width: voteBarWidthA.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.votePercent, { color: Colors.dark.coral }]}>
                    {percentA}%
                  </Text>
                  <Text style={styles.voteCount}>{decision.votesA} votes</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptySideBox}>
              <View style={[styles.sideBadge, { backgroundColor: Colors.dark.coralDim }]}>
                <Text style={[styles.sideBadgeText, { color: Colors.dark.coral }]}>SIDE A</Text>
              </View>
              <View style={styles.emptySideContent}>
                <PenLine size={24} color={Colors.dark.textTertiary} />
                <Text style={styles.emptySideTitle}>Waiting for an argument</Text>
                <Text style={styles.emptySideSubtitle}>
                  Be the first to present Side A
                </Text>
              </View>
            </View>
          )}

          <View style={styles.vsContainer}>
            <View style={styles.vsLine} />
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <View style={styles.vsLine} />
          </View>

          {decision.sideB ? (
            <View style={[styles.sideBox, styles.sideBoxB, userVote?.side === "b" && styles.sideBoxVoted]}>
              <View style={styles.sideHeader}>
                <View style={[styles.sideBadge, { backgroundColor: Colors.dark.cyanDim }]}>
                  <Text style={[styles.sideBadgeText, { color: Colors.dark.cyan }]}>SIDE B</Text>
                </View>
                {userVote?.side === "b" && (
                  <View style={[styles.yourVoteBadge, { borderColor: Colors.dark.cyan }]}>
                    <Check size={10} color={Colors.dark.cyan} />
                    <Text style={[styles.yourVoteText, { color: Colors.dark.cyan }]}>Your vote</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sideTitle}>{decision.sideB.title}</Text>
              <Text style={styles.sideArgument}>{decision.sideB.argument}</Text>

              {sideBContributorProfile && (
                <Pressable
                  style={styles.contributorRow}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/user/${decision.sideBContributor}`);
                  }}
                  hitSlop={4}
                >
                  <Image
                    source={{ uri: sideBContributorProfile.avatar }}
                    style={styles.contributorAvatar}
                    contentFit="cover"
                    cachePolicy="none"
                  />
                  <Text style={styles.contributorName}>by {sideBContributorProfile.name}</Text>
                </Pressable>
              )}

              {hasVoted && (
                <View style={styles.voteResult}>
                  <View style={styles.voteBarTrack}>
                    <Animated.View
                      style={[
                        styles.voteBarFill,
                        {
                          backgroundColor: Colors.dark.cyan,
                          width: voteBarWidthB.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.votePercent, { color: Colors.dark.cyan }]}>
                    {percentB}%
                  </Text>
                  <Text style={styles.voteCount}>{decision.votesB} votes</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptySideBox}>
              <View style={[styles.sideBadge, { backgroundColor: Colors.dark.cyanDim }]}>
                <Text style={[styles.sideBadgeText, { color: Colors.dark.cyan }]}>SIDE B</Text>
              </View>
              <View style={styles.emptySideContent}>
                <PenLine size={24} color={Colors.dark.textTertiary} />
                <Text style={styles.emptySideTitle}>Waiting for an argument</Text>
                <Text style={styles.emptySideSubtitle}>
                  Present the opposing view
                </Text>
              </View>
            </View>
          )}
        </View>

        {!isOpen && (
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <Brain size={20} color={Colors.dark.gold} />
              <Text style={styles.aiHeaderTitle}>AI Judge</Text>
              <Sparkles size={14} color={Colors.dark.gold} />
            </View>

            {!hasVoted && !aiRevealed ? (
              <View style={styles.aiLocked}>
                <Lock size={32} color={Colors.dark.textTertiary} />
                <Text style={styles.aiLockedTitle}>Vote to Unlock</Text>
                <Text style={styles.aiLockedSubtitle}>
                  Cast your vote to reveal the AI Judge's verdict and reasoning
                </Text>
              </View>
            ) : decision.aiPending ? (
              <View style={styles.aiLocked}>
                <Text style={styles.aiPendingText}>AI is analyzing this debate...</Text>
              </View>
            ) : decision.aiJudgment && aiRevealed ? (
              <Animated.View
                style={[
                  styles.aiContent,
                  {
                    transform: [{ scale: aiRevealScale }],
                    opacity: aiRevealOpacity,
                  },
                ]}
              >
                <Animated.View
                  style={[styles.gavelContainer, { transform: [{ rotate: gavelSpin }] }]}
                >
                  <Gavel size={36} color={Colors.dark.gold} />
                </Animated.View>

                <Animated.View style={[styles.confettiContainer, { opacity: confettiOpacity }]}>
                  <Text style={styles.confettiText}>⚖️</Text>
                </Animated.View>

                <View style={styles.aiVoteBadge}>
                  <Text style={styles.aiVoteLabel}>AI VERDICT</Text>
                  <View
                    style={[
                      styles.aiVoteSide,
                      {
                        backgroundColor:
                          decision.aiJudgment.vote === "a"
                            ? Colors.dark.coralDim
                            : Colors.dark.cyanDim,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.aiVoteSideText,
                        {
                          color:
                            decision.aiJudgment.vote === "a"
                              ? Colors.dark.coral
                              : Colors.dark.cyan,
                        },
                      ]}
                    >
                      Side {decision.aiJudgment.vote === "a" ? "A" : "B"} —{" "}
                      {decision.aiJudgment.vote === "a"
                        ? decision.sideA?.title
                        : decision.sideB?.title}
                    </Text>
                  </View>
                </View>

                <View style={styles.aiConfidenceRow}>
                  <Text style={styles.aiConfidenceLabel}>Confidence</Text>
                  <View style={styles.aiConfidenceBar}>
                    <View
                      style={[
                        styles.aiConfidenceFill,
                        { width: `${Math.round(decision.aiJudgment.confidence * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.aiConfidenceValue}>
                    {Math.round(decision.aiJudgment.confidence * 100)}%
                  </Text>
                </View>

                <Text style={styles.aiReasoning}>{decision.aiJudgment.reasoning}</Text>

                <View style={styles.aiKeyPoints}>
                  <Text style={styles.aiKeyPointsTitle}>Key Reasoning</Text>
                  {decision.aiJudgment.keyPoints.map((point, i) => (
                    <View key={`ai-point-${i}`} style={styles.aiKeyPoint}>
                      <ChevronRight size={14} color={Colors.dark.gold} />
                      <Text style={styles.aiKeyPointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : !decision.aiJudgment ? (
              <View style={styles.aiLocked}>
                <Text style={styles.aiLockedSubtitle}>
                  No AI judgment available yet
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionHeader}>
            <MessageSquare size={16} color={Colors.dark.textSecondary} />
            <Text style={styles.commentsSectionTitle}>
              Discussion ({totalComments})
            </Text>
          </View>

          {decision.justifications.map((j) => {
            const justProfile = getProfileById(j.userId);
            return (
            <View key={j.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Pressable
                  onPress={() => router.push(`/user/${j.userId}`)}
                  style={styles.commentAuthorRow}
                >
                  <Image
                    source={{ uri: justProfile.avatar }}
                    style={styles.commentAvatar}
                    contentFit="cover"
                    cachePolicy="none"
                  />
                  <Text style={styles.commentAuthor}>{justProfile.name}</Text>
                </Pressable>
                <View
                  style={[
                    styles.commentSideBadge,
                    {
                      backgroundColor:
                        j.side === "a" ? Colors.dark.coralDim : Colors.dark.cyanDim,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.commentSideText,
                      { color: j.side === "a" ? Colors.dark.coral : Colors.dark.cyan },
                    ]}
                  >
                    Side {j.side === "a" ? "A" : "B"}
                  </Text>
                </View>
              </View>
              <Text style={styles.commentText}>{j.text}</Text>
            </View>
            );
          })}

          {comments.map((c) => {
            const commentProfile = getProfileById(c.userId);
            return (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Pressable
                    onPress={() => router.push(`/user/${c.userId}`)}
                    style={styles.commentAuthorRow}
                  >
                    <Image
                      source={{ uri: commentProfile.avatar }}
                      style={styles.commentAvatar}
                      contentFit="cover"
                      cachePolicy="none"
                    />
                    <Text style={styles.commentAuthor}>{commentProfile.name}</Text>
                  </Pressable>
                  <Text style={styles.commentTime}>
                    {getRelativeTime(c.createdAt)}
                  </Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            );
          })}

          {totalComments === 0 && (
            <View style={styles.noCommentsContainer}>
              <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {isOpen && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={styles.contributeBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              console.log("[Detail] Navigate to contribute:", decision.id);
              router.push(`/contribute/${decision.id}`);
            }}
            testID="contribute-button"
          >
            <PenLine size={18} color="#fff" />
            <Text style={styles.contributeBtnText}>
              {decision.status === "open_topic"
                ? "Add Your Argument"
                : "Add Counter-Argument"}
            </Text>
          </Pressable>
        </View>
      )}

      {!isOpen && !hasVoted && !showJustificationInput && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.voteButtons}>
            <Pressable
              style={[styles.voteButton, styles.voteButtonA]}
              onPress={() => handleVote("a")}
              testID="vote-a-button"
            >
              <Text style={styles.voteButtonText}>Vote Side A</Text>
              <Text style={styles.voteButtonSubtext}>{decision.sideA?.title}</Text>
            </Pressable>
            <Pressable
              style={[styles.voteButton, styles.voteButtonB]}
              onPress={() => handleVote("b")}
              testID="vote-b-button"
            >
              <Text style={styles.voteButtonText}>Vote Side B</Text>
              <Text style={styles.voteButtonSubtext}>{decision.sideB?.title}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showJustificationInput && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.justificationLabel}>
            Add a comment? (optional)
          </Text>
          <TextInput
            style={styles.justificationInput}
            placeholder="Why did you vote this way?"
            placeholderTextColor={Colors.dark.textTertiary}
            value={justification}
            onChangeText={setJustification}
            multiline
            maxLength={200}
            testID="justification-input"
          />
          <View style={styles.justificationActions}>
            <Pressable style={styles.skipBtn} onPress={skipJustification} testID="skip-justification-btn">
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
            <Pressable style={styles.submitBtn} onPress={submitVote} testID="submit-vote-btn">
              <Text style={styles.submitBtnText}>Submit Vote</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!isOpen && hasVoted && !showJustificationInput && (
        <View style={[styles.commentInputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.dark.textTertiary}
            value={newComment}
            onChangeText={setNewComment}
            maxLength={300}
            testID="comment-input"
          />
          <Pressable
            style={[styles.sendBtn, (!newComment.trim() || isAddingComment) && styles.sendBtnDisabled]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || isAddingComment}
            testID="send-comment-btn"
          >
            <Send size={18} color={newComment.trim() && !isAddingComment ? "#fff" : Colors.dark.textTertiary} />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    marginTop: 8,
  },
  backButtonText: {
    color: Colors.dark.coral,
    fontWeight: "600" as const,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
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
    fontSize: 15,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  creatorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 14,
    paddingVertical: 4,
  },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.dark.coral,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  creatorTime: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginTop: 1,
  },
  contributorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.dark.border,
  },
  contributorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  contributorName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  title: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    lineHeight: 30,
    marginBottom: 12,
  },
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: Colors.dark.border,
    gap: 0,
  },
  likeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 14,
  },
  engagementText: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    fontWeight: "600" as const,
  },
  engagementTextActive: {
    color: "#FF4B6E",
  },
  engagementDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 14,
  },
  commentCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  voteCountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  openStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.goldDim,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 217, 61, 0.2)",
  },
  openStatusText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.gold,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  sidesSection: {
    marginBottom: 20,
  },
  sideBox: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sideBoxA: {},
  sideBoxB: {},
  sideBoxVoted: {
    borderWidth: 2,
  },
  emptySideBox: {
    backgroundColor: Colors.dark.surfaceHighlight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: "dashed" as const,
  },
  emptySideContent: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptySideTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  emptySideSubtitle: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    textAlign: "center",
  },
  sideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sideBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sideBadgeText: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1,
  },
  yourVoteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.dark.coral,
  },
  yourVoteText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.dark.coral,
  },
  sideTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  sideArgument: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 21,
  },
  voteResult: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voteBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.surfaceHighlight,
    overflow: "hidden",
  },
  voteBarFill: {
    height: 6,
    borderRadius: 3,
  },
  votePercent: {
    fontSize: 18,
    fontWeight: "800" as const,
  },
  voteCount: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
  },
  vsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  vsBadge: {
    backgroundColor: Colors.dark.surfaceHighlight,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  vsText: {
    color: Colors.dark.textTertiary,
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: 2,
  },
  aiSection: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 20,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  aiHeaderTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    flex: 1,
  },
  aiLocked: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 10,
  },
  aiLockedTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  aiLockedSubtitle: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    textAlign: "center",
    lineHeight: 18,
  },
  aiPendingText: {
    fontSize: 14,
    color: Colors.dark.textTertiary,
    fontStyle: "italic" as const,
  },
  aiContent: {},
  gavelContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  confettiContainer: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
  },
  confettiText: {
    fontSize: 40,
  },
  aiVoteBadge: {
    alignItems: "center",
    marginBottom: 16,
  },
  aiVoteLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.textTertiary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  aiVoteSide: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  aiVoteSideText: {
    fontSize: 15,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  aiConfidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  aiConfidenceLabel: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    fontWeight: "600" as const,
  },
  aiConfidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.dark.surfaceHighlight,
    borderRadius: 3,
    overflow: "hidden",
  },
  aiConfidenceFill: {
    height: 6,
    backgroundColor: Colors.dark.gold,
    borderRadius: 3,
  },
  aiConfidenceValue: {
    fontSize: 12,
    color: Colors.dark.gold,
    fontWeight: "700" as const,
  },
  aiReasoning: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  aiKeyPoints: {
    gap: 8,
  },
  aiKeyPointsTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  aiKeyPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  aiKeyPointText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  commentsSectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  commentCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
  },
  commentSideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commentSideText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  commentText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  noCommentsContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.dark.border,
  },
  contributeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.coral,
  },
  contributeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  voteButtons: {
    flexDirection: "row",
    gap: 10,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  voteButtonA: {
    backgroundColor: Colors.dark.coral,
  },
  voteButtonB: {
    backgroundColor: Colors.dark.cyan,
  },
  voteButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  voteButtonSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 2,
  },
  justificationLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  justificationInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 12,
    color: Colors.dark.text,
    fontSize: 14,
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  justificationActions: {
    flexDirection: "row",
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  skipBtnText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.dark.coral,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  commentInputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.dark.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.dark.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dark.coral,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.dark.surface,
  },
});

