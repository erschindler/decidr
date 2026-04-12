import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const EFFECTIVE_DATE = "April 5, 2026";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          testID="privacy-back-btn"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Privacy Policy</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: {EFFECTIVE_DATE}</Text>

        <Text style={styles.body}>
          Decidr Inc. ("we," "us," or "our") operates the Decidr mobile application ("the App"). This Privacy Policy describes how we collect, use, disclose, and protect your personal information when you use the App.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>

        <Text style={styles.subTitle}>1.1 Information You Provide</Text>
        <Text style={styles.body}>
          • Account registration details (email address, display name, password){"\n"}• User Content you submit (debate topics, arguments, votes, comments){"\n"}• Communications with us (support requests, feedback)
        </Text>

        <Text style={styles.subTitle}>1.2 Information Collected Automatically</Text>
        <Text style={styles.body}>
          • Device information (device type, operating system, unique device identifiers){"\n"}• Usage data (features accessed, time spent, interactions){"\n"}• Log data (IP address, browser type, referring pages, date/time stamps){"\n"}• Analytics data via third-party services
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use the collected information to:{"\n\n"}• Provide, maintain, and improve the App{"\n"}• Create and manage your account{"\n"}• Process your votes and display debate results{"\n"}• Generate AI Judge verdicts based on submitted arguments{"\n"}• Send you notifications about activity on your debates{"\n"}• Communicate with you about updates, security alerts, and support{"\n"}• Detect, prevent, and address technical issues and abuse{"\n"}• Analyze usage trends to improve user experience{"\n"}• Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>3. Sharing of Information</Text>
        <Text style={styles.body}>
          We do not sell your personal information. We may share your information in the following circumstances:{"\n\n"}• With your consent or at your direction{"\n"}• With service providers who assist in operating the App (hosting, analytics, AI processing){"\n"}• To comply with legal obligations, court orders, or governmental requests{"\n"}• To protect our rights, privacy, safety, or property{"\n"}• In connection with a merger, acquisition, or sale of assets{"\n\n"}Your public User Content (debate topics, arguments, votes, and comments) is visible to other users of the App.
        </Text>

        <Text style={styles.sectionTitle}>4. AI Data Processing</Text>
        <Text style={styles.body}>
          The AI Judge feature processes debate arguments using third-party AI services. Arguments submitted to the App may be sent to AI service providers for analysis. We do not use your personal information (name, email) in AI processing — only the debate content itself. AI-generated verdicts are stored in our database and associated with the relevant debate.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.body}>
          We implement appropriate technical and organizational measures to protect your personal information, including encryption of data in transit and at rest, secure authentication mechanisms, and regular security assessments. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.body}>
          We retain your personal information for as long as your account is active or as needed to provide you with the App. We may retain certain information after account deletion for legitimate business purposes, legal compliance, dispute resolution, and enforcement of our agreements.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
        <Text style={styles.body}>
          Depending on your jurisdiction, you may have the following rights:{"\n\n"}• Access your personal information{"\n"}• Correct inaccurate information{"\n"}• Delete your account and associated data{"\n"}• Object to or restrict processing{"\n"}• Data portability{"\n"}• Withdraw consent{"\n\n"}To exercise these rights, contact us at privacy@decidr.app.
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.body}>
          The App is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we discover that we have collected personal information from a child under 13, we will promptly delete it. If you believe a child under 13 has provided us with personal information, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
        <Text style={styles.body}>
          Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from your jurisdiction. We take appropriate safeguards to ensure your information remains protected in accordance with this Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>10. Third-Party Services</Text>
        <Text style={styles.body}>
          The App may contain links to or integrations with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing them with your information.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy within the App and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions about this Privacy Policy, please contact us at:{"\n\n"}Email: privacy@decidr.app{"\n"}Data Protection Officer: dpo@decidr.app{"\n"}Address: Decidr Inc., 123 Innovation Drive, Wilmington, DE 19801
        </Text>
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
  lastUpdated: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    marginBottom: 24,
    fontWeight: "500" as const,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginTop: 24,
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.text,
    marginTop: 12,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
});

