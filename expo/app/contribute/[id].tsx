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
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Sparkles, Send } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDecisions } from "@/providers/DecisionProvider";
import { useAdmin } from "@/providers/AdminProvider";

export default function ContributeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getDecision, contributeSide } = useDecisions();
  const { settings } = useAdmin();

  const decision = getDecision(id ?? "");

  const [sideTitle, setSideTitle] = useState("");
  const [sideArgument, setSideArgument] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsBothSides = decision?.status === "open_topic";
  const needsSideB = decision?.status === "open_one_side" && decision.sideA !== null;
  const needsSideA = decision?.status === "open_one_side" && decision.sideB !== null;

  const whichSide: "a" | "b" = needsSideA ? "a" : needsSideB ? "b" : "a";
  const sideColor = whichSide === "a" ? Colors.dark.coral : Colors.dark.cyan;
  const sideLabel = whichSide === "a" ? "Side A" : "Side B";

  const existingSide = decision?.sideA ?? decision?.sideB;

  const canSubmit = sideTitle.trim().length >= 2 && sideArgument.trim().length >= 10;

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isSubmitting || !id || !decision) return;
    setIsSubmitting(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      console.log("[Contribute] Submitting side", whichSide, "for decision:", id);
      void contributeSide(id, { title: sideTitle.trim(), argument: sideArgument.trim() }, whichSide);
      router.back();
    } catch (error) {
      console.log("[Contribute] Failed to contribute:", error);
      Alert.alert("Error", "Failed to submit your argument. Please try again.");
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, id, decision, contributeSide, sideTitle, sideArgument, whichSide, router]);

  if (!decision) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorText}>Decision not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton} testID="contribute-error-back">
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
          testID="contribute-back-btn"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>Contribute</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topicCard}>
          <Text style={styles.topicLabel}>DEBATE TOPIC</Text>
          <Text style={styles.topicTitle}>{decision.title}</Text>
        </View>

        {existingSide && !needsBothSides && (
          <View style={styles.existingSideCard}>
            <View style={styles.existingSideHeader}>
              <View
                style={[
                  styles.existingSideDot,
                  {
                    backgroundColor:
                      decision.sideA ? Colors.dark.coral : Colors.dark.cyan,
                  },
                ]}
              />
              <Text
                style={[
                  styles.existingSideLabel,
                  {
                    color: decision.sideA ? Colors.dark.coral : Colors.dark.cyan,
                  },
                ]}
              >
                {decision.sideA ? "Side A" : "Side B"} (submitted)
              </Text>
            </View>
            <Text style={styles.existingSideTitle}>{existingSide.title}</Text>
            <Text style={styles.existingSideArgument}>
              {existingSide.argument}
            </Text>
          </View>
        )}

        <View style={styles.contributeSection}>
          <View style={styles.contributeSideHeader}>
            <View style={[styles.contributeSideDot, { backgroundColor: sideColor }]} />
            <Text style={[styles.contributeSideLabel, { color: sideColor }]}>
              {needsBothSides
                ? "Pick a side to argue"
                : `Argue ${sideLabel}`}
            </Text>
          </View>

          {needsBothSides && (
            <Text style={styles.contributeHint}>
              This topic needs both sides. You'll argue Side A — another user will argue Side B.
            </Text>
          )}

          {!needsBothSides && (
            <Text style={styles.contributeHint}>
              Present the opposing argument to complete this debate
            </Text>
          )}

          <TextInput
            style={styles.sideInput}
            placeholder="Short title for your stance"
            placeholderTextColor={Colors.dark.textTertiary}
            value={sideTitle}
            onChangeText={setSideTitle}
            maxLength={60}
            autoFocus
            testID="contribute-title-input"
          />
          <TextInput
            style={[styles.sideInput, styles.argumentInput]}
            placeholder="Make your case... (min 10 characters)"
            placeholderTextColor={Colors.dark.textTertiary}
            value={sideArgument}
            onChangeText={setSideArgument}
            maxLength={settings.argumentCharLimit}
            multiline
            textAlignVertical="top"
            testID="contribute-argument-input"
          />
          <Text style={styles.charCount}>{sideArgument.length}/{settings.argumentCharLimit}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[
            styles.submitBtn,
            { backgroundColor: sideColor },
            !canSubmit && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          testID="contribute-submit-btn"
        >
          <View style={styles.submitRow}>
            {needsBothSides || needsSideA ? (
              <Send size={16} color="#fff" />
            ) : (
              <Sparkles size={16} color="#fff" />
            )}
            <Text style={styles.submitBtnText}>
              {isSubmitting
                ? "Submitting..."
                : needsBothSides
                  ? "Submit Your Argument"
                  : "Complete Debate & Trigger AI"}
            </Text>
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
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
    fontSize: 16,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topicCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  topicLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    lineHeight: 26,
  },
  existingSideCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  existingSideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  existingSideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  existingSideLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  existingSideTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  existingSideArgument: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  contributeSection: {
    marginBottom: 20,
  },
  contributeSideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  contributeSideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  contributeSideLabel: {
    fontSize: 16,
    fontWeight: "800" as const,
  },
  contributeHint: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
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
    minHeight: 140,
    fontWeight: "400" as const,
    fontSize: 15,
    lineHeight: 22,
  },
  charCount: {
    textAlign: "right",
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700" as const,
  },
});

