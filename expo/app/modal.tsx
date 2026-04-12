import React from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      <View style={styles.modalContent}>
        <Text style={styles.emoji}>⚖️</Text>
        <Text style={styles.title}>Decidr</Text>
        <Text style={styles.description}>
          Settle arguments. Get the verdict. Let the community and AI Judge decide.
        </Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          testID="modal-close-btn"
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    minWidth: 300,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  description: {
    textAlign: "center",
    marginBottom: 24,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: Colors.dark.coral,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "700" as const,
    textAlign: "center",
    fontSize: 15,
  },
});

