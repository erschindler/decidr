import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  X,
  ChevronRight,
  Sparkles,
  MessageCircle,
  Lightbulb,
  Swords,
  Check,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDecisions } from "@/providers/DecisionProvider";
import { useAdmin } from "@/providers/AdminProvider";
import { Category, CATEGORIES, SubmissionMode } from "@/types/decision";

const MODES: { id: SubmissionMode; title: string; subtitle: string; icon: typeof MessageCircle }[] = [
  {
    id: "full",
    title: "Full Debate",
    subtitle: "Submit topic + both sides",
    icon: Swords,
  },
  {
    id: "topic_only",
    title: "Topic Only",
    subtitle: "Let others argue both sides",
    icon: Lightbulb,
  },
  {
    id: "topic_and_side",
    title: "Your Take",
    subtitle: "Share your view, invite a counter",
    icon: MessageCircle,
  },
];

export default function CreateDecisionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createDecision, createTopicOnly, createTopicAndSide } = useDecisions();
  const { settings } = useAdmin();

  const [mode, setMode] = useState<SubmissionMode | null>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("random");
  const [sideATitle, setSideATitle] = useState("");
  const [sideAArgument, setSideAArgument] = useState("");
  const [sideBTitle, setSideBTitle] = useState("");
  const [sideBArgument, setSideBArgument] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStepLabels = useCallback((): string[] => {
    if (!mode) return ["Mode"];
    if (mode === "full") return ["Topic", "Category", "Side A", "Side B"];
    if (mode === "topic_only") return ["Topic", "Category"];
    return ["Topic", "Category", "Your Take"];
  }, [mode]);

  const getMaxStep = useCallback((): number => {
    if (!mode) return 0;
    if (mode === "full") return 3;
    if (mode === "topic_only") return 1;
    return 2;
  }, [mode]);

  const canProceed = useCallback(() => {
    if (mode === null) return false;
    switch (step) {
      case 0:
        return title.trim().length >= 5;
      case 1:
        return true;
      case 2:
        if (mode === "full") {
          return sideATitle.trim().length >= 2 && sideAArgument.trim().length >= 10;
        }
        if (mode === "topic_and_side") {
          return sideATitle.trim().length >= 2 && sideAArgument.trim().length >= 10;
        }
        return false;
      case 3:
        return sideBTitle.trim().length >= 2 && sideBArgument.trim().length >= 10;
      default:
        return false;
    }
  }, [step, mode, title, sideATitle, sideAArgument, sideBTitle, sideBArgument]);

  const handleSelectMode = useCallback((selectedMode: SubmissionMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("[Create] Mode selected:", selectedMode);
    setMode(selectedMode);
    setStep(0);
  }, []);

  const handleNext = useCallback(() => {
    if (!canProceed()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const maxStep = getMaxStep();
    if (step < maxStep) {
      console.log("[Create] Moving to step:", step + 1);
      setStep(step + 1);
    }
  }, [step, canProceed, getMaxStep]);

  const handleSubmit = useCallback(async () => {
    if (!canProceed() || isSubmitting || !mode) return;
    setIsSubmitting(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log("[Create] Submitting decision, mode:", mode, "title:", title.trim());
    try {
      if (mode === "full") {
        await createDecision(
          title.trim(),
          category,
          { title: sideATitle.trim(), argument: sideAArgument.trim() },
          { title: sideBTitle.trim(), argument: sideBArgument.trim() }
        );
      } else if (mode === "topic_only") {
        await createTopicOnly(title.trim(), category);
      } else if (mode === "topic_and_side") {
        await createTopicAndSide(
          title.trim(),
          category,
          { title: sideATitle.trim(), argument: sideAArgument.trim() },
          "a"
        );
      }
      console.log("[Create] Decision created successfully");
      router.back();
    } catch (error) {
      console.log("[Create] Failed to create decision:", error);
      Alert.alert("Error", "Failed to create decision. Please try again.");
      setIsSubmitting(false);
    }
  }, [canProceed, isSubmitting, mode, createDecision, createTopicOnly, createTopicAndSide, title, category, sideATitle, sideAArgument, sideBTitle, sideBArgument, router]);

  const stepLabels = getStepLabels();
  const maxStep = getMaxStep();
  const isLastStep = mode !== null && step === maxStep;

  const getSubmitLabel = useCallback((): string => {
    if (isSubmitting) return "Creating...";
    if (mode === "full") return "Create & Get AI Verdict";
    if (mode === "topic_only") return "Post Topic for Debate";
    return "Post Your Take";
  }, [mode, isSubmitting]);

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
            if (mode === null) {
              router.back();
            } else if (step === 0) {
              setMode(null);
            } else {
              setStep(step - 1);
            }
          }}
          style={styles.closeBtn}
          testID="create-back-btn"
        >
          {mode === null ? (
            <X size={22} color={Colors.dark.text} />
          ) : (
            <ChevronRight
              size={22}
              color={Colors.dark.text}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
          )}
        </Pressable>
        <Text style={styles.topBarTitle}>
          {mode === null ? "New Decision" : stepLabels[step]}
        </Text>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.closeBtn}
          testID="create-close-btn"
        >
          <X size={22} color={Colors.dark.text} />
        </Pressable>
      </View>

      {mode !== null && (
        <View style={styles.stepIndicator}>
          {stepLabels.map((label, i) => (
            <View key={`${label}-${i}`} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  i <= step && styles.stepDotActive,
                  i < step && styles.stepDotCompleted,
                ]}
              >
                {i < step ? (
                  <Check size={12} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      i <= step && styles.stepNumberActive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  i <= step && styles.stepLabelActive,
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mode === null && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How do you want to start?</Text>
            <Text style={styles.stepSubtitle}>
              Choose how much you want to fill in yourself
            </Text>
            <View style={styles.modeList}>
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <Pressable
                    key={m.id}
                    style={styles.modeCard}
                    onPress={() => handleSelectMode(m.id)}
                    testID={`create-mode-${m.id}`}
                  >
                    <View style={styles.modeIconContainer}>
                      <Icon size={22} color={Colors.dark.coral} />
                    </View>
                    <View style={styles.modeTextContainer}>
                      <Text style={styles.modeTitle}>{m.title}</Text>
                      <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.dark.textTertiary} />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modeInfoBox}>
              <Lightbulb size={16} color={Colors.dark.gold} />
              <Text style={styles.modeInfoText}>
                "Topic Only" and "Your Take" let the community fill in the missing arguments. Once both sides are complete, voting opens automatically.
              </Text>
            </View>
          </View>
        )}

        {mode !== null && step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's the debate?</Text>
            <Text style={styles.stepSubtitle}>
              Write a clear, neutral title for your decision
            </Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g. Pineapple belongs on pizza"
              placeholderTextColor={Colors.dark.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={settings.debateTopicCharLimit}
              multiline
              autoFocus
              testID="create-title-input"
            />
            <Text style={styles.charCount}>{title.length}/{settings.debateTopicCharLimit}</Text>
          </View>
        )}

        {mode !== null && step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pick a category</Text>
            <Text style={styles.stepSubtitle}>
              Help people find your debate
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    category === cat.id && styles.categoryItemActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    void Haptics.selectionAsync();
                  }}
                  testID={`create-category-${cat.id}`}
                >
                  <Text style={styles.categoryItemEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryItemText,
                      category === cat.id && styles.categoryItemTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {mode === "full" && step === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.sideHeaderRow}>
              <View style={[styles.sideIndicatorDot, { backgroundColor: Colors.dark.coral }]} />
              <Text style={[styles.stepTitle, { color: Colors.dark.coral }]}>Side A</Text>
            </View>
            <Text style={styles.stepSubtitle}>
              Present the first perspective
            </Text>
            <TextInput
              style={styles.sideInput}
              placeholder="Short title (e.g. 'Yes, absolutely')"
              placeholderTextColor={Colors.dark.textTertiary}
              value={sideATitle}
              onChangeText={setSideATitle}
              maxLength={60}
              autoFocus
              testID="create-sideA-title"
            />
            <TextInput
              style={[styles.sideInput, styles.argumentInput]}
              placeholder="Make your case... (min 10 characters)"
              placeholderTextColor={Colors.dark.textTertiary}
              value={sideAArgument}
              onChangeText={setSideAArgument}
              maxLength={settings.argumentCharLimit}
              multiline
              textAlignVertical="top"
              testID="create-sideA-argument"
            />
            <Text style={styles.charCount}>{sideAArgument.length}/{settings.argumentCharLimit}</Text>
          </View>
        )}

        {mode === "full" && step === 3 && (
          <View style={styles.stepContent}>
            <View style={styles.sideHeaderRow}>
              <View style={[styles.sideIndicatorDot, { backgroundColor: Colors.dark.cyan }]} />
              <Text style={[styles.stepTitle, { color: Colors.dark.cyan }]}>Side B</Text>
            </View>
            <Text style={styles.stepSubtitle}>
              Present the opposing perspective
            </Text>
            <TextInput
              style={styles.sideInput}
              placeholder="Short title (e.g. 'No way')"
              placeholderTextColor={Colors.dark.textTertiary}
              value={sideBTitle}
              onChangeText={setSideBTitle}
              maxLength={60}
              autoFocus
              testID="create-sideB-title"
            />
            <TextInput
              style={[styles.sideInput, styles.argumentInput]}
              placeholder="Make the counter-case... (min 10 characters)"
              placeholderTextColor={Colors.dark.textTertiary}
              value={sideBArgument}
              onChangeText={setSideBArgument}
              maxLength={settings.argumentCharLimit}
              multiline
              textAlignVertical="top"
              testID="create-sideB-argument"
            />
            <Text style={styles.charCount}>{sideBArgument.length}/{settings.argumentCharLimit}</Text>
          </View>
        )}

        {mode === "topic_and_side" && step === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.sideHeaderRow}>
              <View style={[styles.sideIndicatorDot, { backgroundColor: Colors.dark.coral }]} />
              <Text style={[styles.stepTitle, { color: Colors.dark.coral }]}>Your Position</Text>
            </View>
            <Text style={styles.stepSubtitle}>
              Share your take — someone else will argue against it
            </Text>
            <TextInput
              style={styles.sideInput}
              placeholder="Short title for your stance"
              placeholderTextColor={Colors.dark.textTertiary}
              value={sideATitle}
              onChangeText={setSideATitle}
              maxLength={60}
              autoFocus
              testID="create-position-title"
            />
            <TextInput
              style={[styles.sideInput, styles.argumentInput]}
              placeholder="Make your case... (min 10 characters)"
              placeholderTextColor={Colors.dark.textTertiary}
              value={sideAArgument}
              onChangeText={setSideAArgument}
              maxLength={settings.argumentCharLimit}
              multiline
              textAlignVertical="top"
              testID="create-position-argument"
            />
            <Text style={styles.charCount}>{sideAArgument.length}/{settings.argumentCharLimit}</Text>
          </View>
        )}
      </ScrollView>

      {mode !== null && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[
              styles.nextBtn,
              !canProceed() && styles.nextBtnDisabled,
              isLastStep && styles.submitBtnStyle,
            ]}
            onPress={isLastStep ? handleSubmit : handleNext}
            disabled={!canProceed() || isSubmitting}
            testID="create-next-btn"
          >
            {isLastStep ? (
              <View style={styles.submitRow}>
                <Sparkles size={16} color="#fff" />
                <Text style={styles.nextBtnText}>{getSubmitLabel()}</Text>
              </View>
            ) : (
              <View style={styles.submitRow}>
                <Text style={styles.nextBtnText}>Next</Text>
                <ChevronRight size={18} color="#fff" />
              </View>
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
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
    paddingBottom: 12,
    gap: 12,
  },
  closeBtn: {
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
    fontSize: 16,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 20,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  stepDotActive: {
    borderColor: Colors.dark.coral,
    backgroundColor: Colors.dark.coralDim,
  },
  stepDotCompleted: {
    backgroundColor: Colors.dark.coral,
    borderColor: Colors.dark.coral,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.dark.textTertiary,
  },
  stepNumberActive: {
    color: Colors.dark.coral,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  stepLabelActive: {
    color: Colors.dark.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
  },
  stepContent: {},
  stepTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 20,
  },
  modeList: {
    gap: 12,
    marginBottom: 20,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dark.coralDim,
    justifyContent: "center",
    alignItems: "center",
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  modeSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  modeInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.dark.goldDim,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 217, 61, 0.2)",
  },
  modeInfoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  titleInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "600" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryItemActive: {
    borderColor: Colors.dark.coral,
    backgroundColor: Colors.dark.coralDim,
  },
  categoryItemEmoji: {
    fontSize: 16,
  },
  categoryItemText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  categoryItemTextActive: {
    color: Colors.dark.coral,
  },
  sideHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sideIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sideInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 10,
  },
  argumentInput: {
    minHeight: 120,
    fontWeight: "400" as const,
    fontSize: 15,
    lineHeight: 22,
  },
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.coral,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnStyle: {
    backgroundColor: Colors.dark.coral,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  submitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

