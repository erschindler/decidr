import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const EFFECTIVE_DATE = "April 5, 2026";

export default function EULAScreen() {
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
          testID="eula-back-btn"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>End User License Agreement</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: {EFFECTIVE_DATE}</Text>

        <Text style={styles.body}>
          This End User License Agreement ("EULA") is a legal agreement between you ("User") and Decidr Inc. ("Licensor") for the use of the Decidr mobile application ("Licensed Application").
        </Text>

        <Text style={styles.sectionTitle}>1. License Grant</Text>
        <Text style={styles.body}>
          The Licensor grants you a revocable, non-exclusive, non-transferable, limited license to download, install, and use the Licensed Application on devices that you own or control, strictly in accordance with this EULA and the App Store terms of service.
        </Text>

        <Text style={styles.sectionTitle}>2. Restrictions</Text>
        <Text style={styles.body}>
          You agree not to, and you will not permit others to:{"\n\n"}• License, sell, rent, lease, assign, distribute, transmit, host, outsource, disclose, or otherwise commercially exploit the Licensed Application{"\n"}• Copy or use the Licensed Application for any purpose other than as permitted under this EULA{"\n"}• Modify, make derivative works of, disassemble, decrypt, reverse compile, or reverse engineer any part of the Licensed Application{"\n"}• Remove, alter, or obscure any proprietary notice (including copyright or trademark notices) of the Licensor or its affiliates{"\n"}• Use the Licensed Application in violation of any applicable laws or regulations
        </Text>

        <Text style={styles.sectionTitle}>3. Intellectual Property</Text>
        <Text style={styles.body}>
          The Licensed Application, including without limitation all copyrights, patents, trademarks, trade secrets, and other intellectual property rights, is and shall remain the sole and exclusive property of the Licensor. This EULA does not convey to you any interest in or to the Licensed Application, but only a limited right of use.
        </Text>

        <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
        <Text style={styles.body}>
          The Licensed Application may display, include, or make available third-party content, including AI-generated content, or provide links to third-party websites or services. You acknowledge that the Licensor is not responsible for such third-party services, including their accuracy, completeness, timeliness, validity, legality, or quality.
        </Text>

        <Text style={styles.sectionTitle}>5. User-Generated Content</Text>
        <Text style={styles.body}>
          The Licensed Application allows users to create and share content. You are solely responsible for the content you submit. The Licensor reserves the right to remove any content that violates this EULA, our Terms of Service, or applicable laws without notice.
        </Text>

        <Text style={styles.sectionTitle}>6. Privacy</Text>
        <Text style={styles.body}>
          The Licensor collects and uses your information as described in our Privacy Policy, which is incorporated into this EULA by reference. By using the Licensed Application, you consent to such collection and use.
        </Text>

        <Text style={styles.sectionTitle}>7. No Warranty</Text>
        <Text style={styles.body}>
          THE LICENSED APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. THE LICENSOR DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Text>

        <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
        <Text style={styles.body}>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE LICENSOR BE LIABLE FOR ANY SPECIAL, INCIDENTAL, INDIRECT, OR CONSEQUENTIAL DAMAGES WHATSOEVER ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE LICENSED APPLICATION.
        </Text>

        <Text style={styles.sectionTitle}>9. Apple App Store Compliance</Text>
        <Text style={styles.body}>
          This EULA is between you and Decidr Inc. only, and not with Apple Inc. ("Apple"). Apple has no obligation to furnish any maintenance or support services for the Licensed Application. Apple is not responsible for addressing any claims by you or any third party relating to the Licensed Application. Apple and its subsidiaries are third-party beneficiaries of this EULA, and upon your acceptance, Apple will have the right to enforce this EULA against you.
        </Text>

        <Text style={styles.sectionTitle}>10. Termination</Text>
        <Text style={styles.body}>
          This EULA is effective until terminated. Your rights under this EULA will terminate automatically without notice if you fail to comply with any of its terms. Upon termination, you must cease all use of the Licensed Application and destroy all copies.
        </Text>

        <Text style={styles.sectionTitle}>11. Amendments</Text>
        <Text style={styles.body}>
          The Licensor reserves the right to modify this EULA at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. Your continued use of the Licensed Application after changes become effective constitutes acceptance of the revised EULA.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Information</Text>
        <Text style={styles.body}>
          If you have any questions about this EULA, please contact us at:{"\n\n"}Email: legal@decidr.app{"\n"}Address: Decidr Inc., 123 Innovation Drive, Wilmington, DE 19801
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
  body: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
});

