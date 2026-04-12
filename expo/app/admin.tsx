import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
  Clock,
  Type,
  Megaphone,
  Trash2,
  Settings,
  Save,
  Eraser,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAdmin } from "@/providers/AdminProvider";
import { useDecisions } from "@/providers/DecisionProvider";
import { Decision } from "@/types/decision";

export default function AdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, settings, updateSettings, deleteDecision, deleteArgument, isSavingSettings, isDeletingDecision } = useAdmin();
  const { decisions } = useDecisions();

  const [topicLimit, setTopicLimit] = useState(String(settings.debateTopicCharLimit));
  const [argLimit, setArgLimit] = useState(String(settings.argumentCharLimit));
  const [timeframe, setTimeframe] = useState(String(settings.debateTimeframeDays));
  const [showModeration, setShowModeration] = useState(false);

  useEffect(() => {
    setTopicLimit(String(settings.debateTopicCharLimit));
    setArgLimit(String(settings.argumentCharLimit));
    setTimeframe(String(settings.debateTimeframeDays));
  }, [settings.debateTopicCharLimit, settings.argumentCharLimit, settings.debateTimeframeDays]);

  const handleSaveSettings = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const parsedTopic = Math.max(50, Math.min(2000, parseInt(topicLimit, 10) || 500));
    const parsedArg = Math.max(50, Math.min(5000, parseInt(argLimit, 10) || 500));
    const parsedTime = Math.max(1, Math.min(365, parseInt(timeframe, 10) || 7));

    console.log("[Admin] Saving settings:", { parsedTopic, parsedArg, parsedTime });
    updateSettings({
      debateTopicCharLimit: parsedTopic,
      argumentCharLimit: parsedArg,
      debateTimeframeDays: parsedTime,
    });

    setTopicLimit(String(parsedTopic));
    setArgLimit(String(parsedArg));
    setTimeframe(String(parsedTime));
  }, [topicLimit, argLimit, timeframe, updateSettings]);

  const handleDeleteDecision = useCallback((decision: Decision) => {
    Alert.alert(
      "Delete Decision",
      `Are you sure you want to delete "${decision.title}"? This will also remove all related votes, comments, and likes. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log("[Admin] Deleting decision:", decision.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteDecision(decision.id);
          },
        },
      ]
    );
  }, [deleteDecision]);

  const handleDeleteArgument = useCallback((decision: Decision, side: "a" | "b") => {
    const sideLabel = side === "a" ? "Side A" : "Side B";
    const sideTitle = side === "a" ? decision.sideA?.title : decision.sideB?.title;
    Alert.alert(
      `Delete ${sideLabel}`,
      `Remove ${sideLabel} ("${sideTitle}") from "${decision.title}"? The debate will revert to waiting for a new argument.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log("[Admin] Deleting argument:", side, "from decision:", decision.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteArgument(decision.id, side);
          },
        },
      ]
    );
  }, [deleteArgument]);

  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.noAccessContainer}>
          <Shield size={48} color={Colors.dark.textTertiary} />
          <Text style={styles.noAccessTitle}>Admin Access Required</Text>
          <Text style={styles.noAccessSubtitle}>
            You don't have admin privileges
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
          testID="admin-back-btn"
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Admin Panel</Text>
        <View style={styles.adminBadge}>
          <Shield size={14} color={Colors.dark.coral} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Megaphone size={16} color={Colors.dark.coral} />
            <Text style={styles.sectionTitle}>Advertising</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Banner Ads</Text>
              <Text style={styles.settingDescription}>
                Show banner ads throughout the app
              </Text>
            </View>
            <Switch
              value={settings.adsEnabled}
              onValueChange={(val) => {
                void Haptics.selectionAsync();
                updateSettings({ adsEnabled: val });
              }}
              trackColor={{ false: Colors.dark.surfaceHighlight, true: Colors.dark.coralDim }}
              thumbColor={settings.adsEnabled ? Colors.dark.coral : Colors.dark.textTertiary}
              testID="ads-toggle"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={16} color={Colors.dark.cyan} />
            <Text style={styles.sectionTitle}>Character Limits</Text>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Debate Topic Limit</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.numberInput}
                value={topicLimit}
                onChangeText={setTopicLimit}
                keyboardType="number-pad"
                maxLength={5}
                testID="topic-limit-input"
              />
              <Text style={styles.inputUnit}>chars</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Argument Limit</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.numberInput}
                value={argLimit}
                onChangeText={setArgLimit}
                keyboardType="number-pad"
                maxLength={5}
                testID="arg-limit-input"
              />
              <Text style={styles.inputUnit}>chars</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color={Colors.dark.gold} />
            <Text style={styles.sectionTitle}>Debate Timeframe</Text>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Days before settling</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.numberInput}
                value={timeframe}
                onChangeText={setTimeframe}
                keyboardType="number-pad"
                maxLength={3}
                testID="timeframe-input"
              />
              <Text style={styles.inputUnit}>days</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            Debates older than this will be marked as settled
          </Text>
        </View>

        <Pressable
          style={styles.saveBtn}
          onPress={handleSaveSettings}
          testID="admin-save-btn"
        >
          {isSavingSettings ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.saveBtnContent}>
              <Save size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={16} color={Colors.dark.textSecondary} />
            <Text style={styles.sectionTitle}>Moderation</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Content Moderation</Text>
              <Text style={styles.settingDescription}>
                Enable moderation features
              </Text>
            </View>
            <Switch
              value={settings.moderationEnabled}
              onValueChange={(val) => {
                void Haptics.selectionAsync();
                updateSettings({ moderationEnabled: val });
              }}
              trackColor={{ false: Colors.dark.surfaceHighlight, true: Colors.dark.cyanDim }}
              thumbColor={settings.moderationEnabled ? Colors.dark.cyan : Colors.dark.textTertiary}
              testID="moderation-toggle"
            />
          </View>

          <Pressable
            style={styles.moderationToggle}
            onPress={() => setShowModeration(!showModeration)}
            testID="show-moderation-btn"
          >
            <Text style={styles.moderationToggleText}>
              {showModeration ? "Hide" : "Show"} All Decisions ({decisions.length})
            </Text>
            {showModeration ? (
              <EyeOff size={16} color={Colors.dark.textSecondary} />
            ) : (
              <Eye size={16} color={Colors.dark.textSecondary} />
            )}
          </Pressable>
        </View>

        {isDeletingDecision && (
          <View style={styles.deletingBanner}>
            <ActivityIndicator size="small" color={Colors.dark.coral} />
            <Text style={styles.deletingText}>Deleting...</Text>
          </View>
        )}

        {showModeration && (
          <View style={styles.moderationList}>
            {decisions.map((d) => (
              <View key={d.id} style={styles.moderationCard}>
                <View style={styles.moderationCardHeader}>
                  <Text style={styles.moderationCardTitle} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <View style={styles.moderationMeta}>
                    <Text style={styles.moderationStatus}>{d.status}</Text>
                    <Text style={styles.moderationVotes}>{d.totalVotes}v</Text>
                  </View>
                </View>

                {d.sideA && (
                  <View style={styles.argumentRow}>
                    <Text style={styles.argumentLabel} numberOfLines={1}>
                      A: {d.sideA.title}
                    </Text>
                    <Pressable
                      style={styles.deleteArgBtn}
                      onPress={() => handleDeleteArgument(d, "a")}
                      testID={`delete-arg-a-${d.id}`}
                    >
                      <Eraser size={12} color={Colors.dark.coral} />
                      <Text style={styles.deleteArgText}>Remove</Text>
                    </Pressable>
                  </View>
                )}

                {d.sideB && (
                  <View style={styles.argumentRow}>
                    <Text style={styles.argumentLabel} numberOfLines={1}>
                      B: {d.sideB.title}
                    </Text>
                    <Pressable
                      style={styles.deleteArgBtn}
                      onPress={() => handleDeleteArgument(d, "b")}
                      testID={`delete-arg-b-${d.id}`}
                    >
                      <Eraser size={12} color={Colors.dark.cyan} />
                      <Text style={styles.deleteArgTextCyan}>Remove</Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.moderationActions}>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteDecision(d)}
                    testID={`delete-decision-${d.id}`}
                  >
                    <Trash2 size={14} color={Colors.dark.error} />
                    <Text style={styles.deleteBtnText}>Delete Entire Debate</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {decisions.length === 0 && (
              <Text style={styles.emptyModeration}>No decisions to moderate</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginTop: 8,
  },
  noAccessSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: Colors.dark.coral,
    fontWeight: "600" as const,
    fontSize: 14,
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
    fontSize: 17,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  adminBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.coralDim,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
    flex: 1,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  numberInput: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700" as const,
    minWidth: 70,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  inputUnit: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    fontWeight: "500" as const,
  },
  helperText: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    lineHeight: 16,
    marginTop: -4,
  },
  saveBtn: {
    backgroundColor: Colors.dark.coral,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  moderationToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  moderationToggleText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  moderationList: {
    gap: 8,
  },
  moderationCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  moderationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  moderationCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
    marginRight: 8,
  },
  moderationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moderationStatus: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase" as const,
  },
  moderationVotes: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  moderationActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.dark.error,
  },
  emptyModeration: {
    fontSize: 14,
    color: Colors.dark.textTertiary,
    textAlign: "center",
    paddingVertical: 20,
  },
  deletingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  deletingText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.error,
  },
  argumentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  argumentLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.dark.textSecondary,
    marginRight: 8,
  },
  deleteArgBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 107, 107, 0.08)",
  },
  deleteArgText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.coral,
  },
  deleteArgTextCyan: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.cyan,
  },
});

