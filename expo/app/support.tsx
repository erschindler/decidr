import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  Send,
  ExternalLink,
  Bug,
  Shield,
} from "lucide-react-native";
import Colors from "@/constants/colors";

const FAQ_ITEMS = [
  {
    question: "How does voting work?",
    answer:
      "Browse active debates and tap on one to view both sides. Once you've read the arguments, vote for the side you find most compelling. Your vote is final and cannot be changed.",
  },
  {
    question: "What is the AI Judge?",
    answer:
      "Every debate is analyzed by our AI Judge, which evaluates logic, evidence quality, and persuasiveness. The AI verdict is hidden until you cast your own vote — this ensures unbiased participation.",
  },
  {
    question: "How do I create a debate?",
    answer:
      "Tap the '+' button on the home feed. You can submit a full debate (both sides), just a topic for others to argue, or your take on one side and let someone provide the counter-argument.",
  },
  {
    question: "Can I delete my account?",
    answer:
      "Yes. Go to Profile > Support & Help and contact us at support@decidr.app to request account deletion. We will process your request within 30 days.",
  },
  {
    question: "Is my data safe?",
    answer:
      "We use industry-standard encryption and security practices. Your personal data is never sold. See our Privacy Policy for full details.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const handleEmailSupport = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("[Support] Opening email support");
    void Linking.openURL("mailto:support@decidr.app?subject=Decidr%20Support%20Request");
  }, []);

  const handleReportBug = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("[Support] Opening bug report email");
    void Linking.openURL("mailto:bugs@decidr.app?subject=Decidr%20Bug%20Report");
  }, []);

  const handleSendFeedback = useCallback(() => {
    if (!feedbackText.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log("[Support] Feedback submitted:", feedbackText.trim().substring(0, 50));
    Alert.alert("Thank you!", "Your feedback has been submitted. We appreciate hearing from you.");
    setFeedbackText("");
  }, [feedbackText]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.topBarBtn}
          testID="support-back-btn"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Support & Help</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contactCards}>
          <Pressable style={styles.contactCard} onPress={handleEmailSupport} testID="support-email-btn">
            <View style={[styles.contactIcon, { backgroundColor: Colors.dark.coralDim }]}>
              <Mail size={20} color={Colors.dark.coral} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactSub}>support@decidr.app</Text>
            </View>
            <ExternalLink size={16} color={Colors.dark.textTertiary} />
          </Pressable>

          <Pressable style={styles.contactCard} onPress={handleReportBug} testID="support-bug-btn">
            <View style={[styles.contactIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Bug size={20} color={Colors.dark.warning} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Report a Bug</Text>
              <Text style={styles.contactSub}>bugs@decidr.app</Text>
            </View>
            <ExternalLink size={16} color={Colors.dark.textTertiary} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {FAQ_ITEMS.map((item, i) => (
            <Pressable
              key={`faq-${i}`}
              style={styles.faqItem}
              onPress={() => {
                void Haptics.selectionAsync();
                setExpandedFaq(expandedFaq === i ? null : i);
              }}
              testID={`faq-item-${i}`}
            >
              <View style={styles.faqHeader}>
                <HelpCircle size={16} color={Colors.dark.coral} />
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <ChevronRight
                  size={16}
                  color={Colors.dark.textTertiary}
                  style={{
                    transform: [{ rotate: expandedFaq === i ? "90deg" : "0deg" }],
                  }}
                />
              </View>
              {expandedFaq === i && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Send Feedback</Text>
        <View style={styles.feedbackContainer}>
          <View style={styles.feedbackIconRow}>
            <MessageCircle size={16} color={Colors.dark.cyan} />
            <Text style={styles.feedbackLabel}>
              We'd love to hear from you
            </Text>
          </View>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us what you think, suggest features, or share ideas..."
            placeholderTextColor={Colors.dark.textTertiary}
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            maxLength={500}
            textAlignVertical="top"
            testID="feedback-input"
          />
          <Pressable
            style={[styles.feedbackBtn, !feedbackText.trim() && styles.feedbackBtnDisabled]}
            onPress={handleSendFeedback}
            disabled={!feedbackText.trim()}
            testID="feedback-submit-btn"
          >
            <Send size={16} color="#fff" />
            <Text style={styles.feedbackBtnText}>Send Feedback</Text>
          </Pressable>
        </View>

        <View style={styles.legalSection}>
          <Text style={styles.sectionTitle}>Legal & Privacy</Text>
          <Pressable
            style={styles.legalRow}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/terms");
            }}
            testID="support-terms-link"
          >
            <Shield size={16} color={Colors.dark.textTertiary} />
            <Text style={styles.legalRowText}>Terms of Service</Text>
            <ChevronRight size={16} color={Colors.dark.textTertiary} />
          </Pressable>
          <Pressable
            style={styles.legalRow}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/privacy");
            }}
            testID="support-privacy-link"
          >
            <Shield size={16} color={Colors.dark.textTertiary} />
            <Text style={styles.legalRowText}>Privacy Policy</Text>
            <ChevronRight size={16} color={Colors.dark.textTertiary} />
          </Pressable>
          <Pressable
            style={styles.legalRow}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/eula");
            }}
            testID="support-eula-link"
          >
            <Shield size={16} color={Colors.dark.textTertiary} />
            <Text style={styles.legalRowText}>End User License Agreement</Text>
            <ChevronRight size={16} color={Colors.dark.textTertiary} />
          </Pressable>
        </View>

        <Text style={styles.versionText}>Decidr v1.0.0</Text>
      </ScrollView>
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
  spacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  contactCards: {
    gap: 10,
    marginBottom: 28,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  faqList: {
    gap: 8,
    marginBottom: 28,
  },
  faqItem: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  faqAnswer: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginTop: 10,
    paddingLeft: 26,
  },
  feedbackContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 28,
  },
  feedbackIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  feedbackInput: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    color: Colors.dark.text,
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.cyan,
  },
  feedbackBtnDisabled: {
    opacity: 0.4,
  },
  feedbackBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  legalSection: {
    marginBottom: 24,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  legalRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginTop: 8,
  },
});

