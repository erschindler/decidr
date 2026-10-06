import React, { useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bookmark } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useSavedDecisions } from "@/providers/SocialProvider";
import { useDecisions } from "@/providers/DecisionProvider";
import { DecisionCard } from "@/components/DecisionCard";
import { Decision } from "@/types/decision";

export default function SavedDebatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const saved = useSavedDecisions();
  const { getUserVote } = useDecisions();

  const renderItem = useCallback(
    ({ item }: { item: Decision }) => (
      <DecisionCard decision={item} userVote={getUserVote(item.id)} />
    ),
    [getUserVote]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backBtn}
          testID="saved-back"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.title}>Saved Debates</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <FlatList
        data={saved}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bookmark size={40} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No saved debates yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any debate to save it for later
            </Text>
          </View>
        }
        testID="saved-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  topBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  topBarSpacer: {
    width: 36,
  },
  title: {
    flex: 1,
    textAlign: "center" as const,
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    lineHeight: 19,
  },
});
