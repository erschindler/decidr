import React, { useCallback, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {
  Award,
  BarChart3,
  Target,
  Brain,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  FileText,
  Camera,
  ShieldCheck,
  Users,
  Pencil,
  X,
  Check,
  Flame,
  Trophy,
  Share2,
  Bookmark,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDecisions, useMyDecisions } from "@/providers/DecisionProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useAdmin } from "@/providers/AdminProvider";
import { useSocial } from "@/providers/SocialProvider";
import { DecisionCard } from "@/components/DecisionCard";
import { BannerAd } from "@/components/BannerAd";
import { Decision } from "@/types/decision";
import { supabase, resolveAvatarUrl, extractAvatarPath } from "@/lib/supabase";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, refreshAll, updateProfileAvatar, updateProfileName, voteStreaks } = useDecisions();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { acceptedFriends, debatesShared } = useSocial();
  const myDecisions = useMyDecisions();

  // Most Popular Debate — the user's debate with the highest vote count
  const mostPopularDebate = useMemo(() => {
    let best: Decision | null = null;
    for (const d of myDecisions) {
      if (d.totalVotes > 0 && (!best || d.totalVotes > best.totalVotes)) best = d;
    }
    return best;
  }, [myDecisions]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<TextInput>(null);


  const { getUserVote } = useDecisions();

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    console.log("[Profile] Pull to refresh");
    refreshAll();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshAll]);

  const renderItem = useCallback(
    ({ item }: { item: Decision }) => (
      <DecisionCard decision={item} userVote={getUserVote(item.id)} />
    ),
    [getUserVote]
  );

  const handleEditName = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewName(profile.name === "You" ? "" : profile.name);
    setEditNameVisible(true);
    setTimeout(() => nameInputRef.current?.focus(), 300);
  }, [profile.name]);

  const handleSaveName = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Username cannot be empty.");
      return;
    }
    if (trimmed.length > 30) {
      Alert.alert("Too Long", "Username must be 30 characters or less.");
      return;
    }
    setSavingName(true);
    try {
      await updateProfileName(trimmed);
      console.log("[Profile] Name saved successfully:", trimmed);
      setEditNameVisible(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log("[Profile] Failed to save name:", error);
      Alert.alert("Error", "Failed to update username. Please try again.");
    } finally {
      setSavingName(false);
    }
  }, [newName, updateProfileName]);

  const handleSignOut = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("[Profile] Sign out pressed");
    signOut();
  }, [signOut]);

  const handlePickAvatar = useCallback(async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log("[Profile] Opening image picker for avatar");

      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to set a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) {
        console.log("[Profile] Image picker cancelled");
        return;
      }

      const asset = result.assets[0];
      console.log("[Profile] Image picked, URI:", asset.uri);
      setUploadingAvatar(true);

      if (!user?.id) {
        console.log("[Profile] No user ID, cannot upload");
        setUploadingAvatar(false);
        return;
      }

      const fileExt = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
      const validExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt) ? fileExt : "jpg";
      const fileName = `${user.id}/avatar_${Date.now()}.${validExt}`;
      const contentType = validExt === "png" ? "image/png" : "image/jpeg";

      try {
        let uploadBody: Blob | ArrayBuffer;

        if (Platform.OS === "web" && asset.file) {
          uploadBody = asset.file;
          console.log("[Profile] Using web File object for upload, size:", asset.file.size);
        } else {
          console.log("[Profile] Fetching image bytes from URI...");
          const response = await fetch(asset.uri);
          const arrayBuffer = await response.arrayBuffer();
          console.log("[Profile] ArrayBuffer created, byteLength:", arrayBuffer.byteLength);

          if (arrayBuffer.byteLength === 0) {
            console.log("[Profile] ERROR: ArrayBuffer is empty, aborting upload");
            Alert.alert("Upload Failed", "Could not read image data. Please try a different photo.");
            setUploadingAvatar(false);
            return;
          }

          uploadBody = arrayBuffer;
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, uploadBody, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.log("[Profile] Upload error:", uploadError.message);
          Alert.alert("Upload Failed", "Could not upload image to storage. Saving local reference instead.");
          await saveAvatarUrl(asset.uri);
          setUploadingAvatar(false);
          return;
        }

        console.log("[Profile] Upload success:", uploadData.path);

        const storagePath = uploadData.path;
        console.log("[Profile] Storing storage path in DB:", storagePath);

        await saveAvatarUrl(storagePath);

        const displayUrl = await resolveAvatarUrl(storagePath);
        console.log("[Profile] Display URL resolved:", displayUrl ? "yes" : "no");
        if (updateProfileAvatar && displayUrl) {
          updateProfileAvatar(displayUrl);
        }
        setUploadingAvatar(false);
      } catch (uploadErr) {
        console.log("[Profile] Upload process error:", uploadErr);
        await saveAvatarUrl(asset.uri);
        setUploadingAvatar(false);
      }
    } catch (error) {
      console.log("[Profile] Avatar upload error:", error);
      setUploadingAvatar(false);
      Alert.alert("Error", "Failed to update profile picture. Please try again.");
    }
  }, [user?.id]);

  const saveAvatarUrl = useCallback(async (avatarUrl: string) => {
    if (!user?.id) return;
    console.log("[Profile] Saving avatar URL:", avatarUrl);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (error) {
      console.log("[Profile] Failed to save avatar to profiles:", error.message);
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });
    if (authError) {
      console.log("[Profile] Failed to sync avatar to auth metadata:", authError.message);
    }

    if (updateProfileAvatar) {
      updateProfileAvatar(avatarUrl);
    }
    refreshAll();
  }, [user?.id, refreshAll, updateProfileAvatar]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={myDecisions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.coral}
            colors={[Colors.dark.coral]}
          />
        }
        ListHeaderComponent={
          <View style={styles.profileSection}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <View style={styles.avatarSection}>
              <Pressable
                onPress={handlePickAvatar}
                style={styles.avatarWrapper}
                testID="profile-avatar-picker"
              >
                <Image
                  source={{ uri: profile.avatar }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="none"
                />
                <View style={styles.cameraOverlay}>
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Camera size={16} color="#fff" />
                  )}
                </View>
              </Pressable>
              <Pressable
                onPress={handleEditName}
                style={styles.nameRow}
                testID="profile-edit-name"
              >
                <Text style={styles.name}>{profile.name}</Text>
                <View style={styles.editNameIcon}>
                  <Pencil size={12} color={Colors.dark.textTertiary} />
                </View>
              </Pressable>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.coralDim }]}>
                  <BarChart3 size={18} color={Colors.dark.coral} />
                </View>
                <Text style={styles.statValue}>{profile.decisionsCreated}</Text>
                <Text style={styles.statLabel}>Created</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.cyanDim }]}>
                  <Target size={18} color={Colors.dark.cyan} />
                </View>
                <Text style={styles.statValue}>{profile.votesCast}</Text>
                <Text style={styles.statLabel}>Votes Cast</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.goldDim }]}>
                  <Brain size={18} color={Colors.dark.gold} />
                </View>
                <Text style={styles.statValue}>{profile.aiAlignmentRate}%</Text>
                <Text style={styles.statLabel}>AI Aligned</Text>
              </View>
            </View>

            <View style={[styles.statsGrid, styles.statsGridSecond]}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.goldDim }]}>
                  <Flame size={18} color={Colors.dark.gold} />
                </View>
                <Text style={styles.statValue}>{voteStreaks.current}</Text>
                <Text style={styles.statLabel}>Daily Streak</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.cyanDim }]}>
                  <Trophy size={18} color={Colors.dark.cyan} />
                </View>
                <Text style={styles.statValue}>{voteStreaks.longest}</Text>
                <Text style={styles.statLabel}>Longest Streak</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.coralDim }]}>
                  <Share2 size={18} color={Colors.dark.coral} />
                </View>
                <Text style={styles.statValue}>{debatesShared}</Text>
                <Text style={styles.statLabel}>Debates Shared</Text>
              </View>
            </View>

            {profile.votesCast > 0 && (
              <Text style={styles.disagreementLine}>
                AI Disagreement: {100 - profile.aiAlignmentRate}%
              </Text>
            )}

            {profile.aiAlignmentRate >= 70 && (
              <View style={styles.badgeCard}>
                <Award size={20} color={Colors.dark.gold} />
                <View style={styles.badgeContent}>
                  <Text style={styles.badgeTitle}>AI Mind Meld</Text>
                  <Text style={styles.badgeSubtitle}>
                    You agree with the AI Judge {profile.aiAlignmentRate}% of the time
                  </Text>
                </View>
              </View>
            )}

            {mostPopularDebate && (
              <Pressable
                style={styles.popularCard}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/decision/${mostPopularDebate.id}`);
                }}
                testID="profile-most-popular"
              >
                <Trophy size={18} color={Colors.dark.gold} />
                <View style={styles.popularContent}>
                  <Text style={styles.popularTitle} numberOfLines={1}>
                    {mostPopularDebate.title}
                  </Text>
                  <Text style={styles.popularSubtitle}>
                    Most Popular Debate · {mostPopularDebate.totalVotes} votes
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.dark.textTertiary} />
              </Pressable>
            )}

            <Pressable
              style={styles.friendsCard}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/saved");
              }}
              testID="profile-saved"
            >
              <View style={styles.friendsLeft}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.goldDim }]}>
                  <Bookmark size={18} color={Colors.dark.gold} />
                </View>
                <View>
                  <Text style={styles.friendsTitle}>Saved Debates</Text>
                  <Text style={styles.friendsSubtitle}>Your bookmarked debates</Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.dark.textTertiary} />
            </Pressable>

            <Pressable
              style={styles.friendsCard}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/friends");
              }}
              testID="profile-friends"
            >
              <View style={styles.friendsLeft}>
                <View style={[styles.statIcon, { backgroundColor: "rgba(255, 107, 107, 0.08)" }]}>
                  <Users size={18} color={Colors.dark.coral} />
                </View>
                <View>
                  <Text style={styles.friendsTitle}>{acceptedFriends.length} Friends</Text>
                  <Text style={styles.friendsSubtitle}>View and manage your connections</Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.dark.textTertiary} />
            </Pressable>

            <BannerAd placement="detail" />

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Settings & Legal</Text>

              {isAdmin && (
                <Pressable
                  style={[styles.settingsRow, styles.adminRow]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/admin");
                  }}
                  testID="profile-admin"
                >
                  <ShieldCheck size={18} color={Colors.dark.coral} />
                  <Text style={[styles.settingsRowText, { color: Colors.dark.coral }]}>Admin Panel</Text>
                  <ChevronRight size={16} color={Colors.dark.coral} />
                </Pressable>
              )}

              <Pressable
                style={styles.settingsRow}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/support");
                }}
                testID="profile-support"
              >
                <HelpCircle size={18} color={Colors.dark.textSecondary} />
                <Text style={styles.settingsRowText}>Support & Help</Text>
                <ChevronRight size={16} color={Colors.dark.textTertiary} />
              </Pressable>

              <Pressable
                style={styles.settingsRow}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/terms");
                }}
                testID="profile-terms"
              >
                <FileText size={18} color={Colors.dark.textSecondary} />
                <Text style={styles.settingsRowText}>Terms of Service</Text>
                <ChevronRight size={16} color={Colors.dark.textTertiary} />
              </Pressable>

              <Pressable
                style={styles.settingsRow}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/privacy");
                }}
                testID="profile-privacy"
              >
                <Shield size={18} color={Colors.dark.textSecondary} />
                <Text style={styles.settingsRowText}>Privacy Policy</Text>
                <ChevronRight size={16} color={Colors.dark.textTertiary} />
              </Pressable>

              <Pressable
                style={styles.settingsRow}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/eula");
                }}
                testID="profile-eula"
              >
                <FileText size={18} color={Colors.dark.textSecondary} />
                <Text style={styles.settingsRowText}>EULA</Text>
                <ChevronRight size={16} color={Colors.dark.textTertiary} />
              </Pressable>

              <Pressable
                style={styles.signOutRow}
                onPress={handleSignOut}
                testID="profile-signout"
              >
                <LogOut size={18} color={Colors.dark.error} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>

              {user?.email && (
                <Text style={styles.emailText}>{user.email}</Text>
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Decisions</Text>
              <Text style={styles.sectionCount}>{myDecisions.length}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>⚖️</Text>
            <Text style={styles.emptyTitle}>No decisions yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first debate and let the community decide!
            </Text>
          </View>
        }
        testID="profile-decisions-list"
      />
      <Modal
        visible={editNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditNameVisible(false)}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Username</Text>
                <Pressable
                  onPress={() => setEditNameVisible(false)}
                  style={styles.modalCloseBtn}
                  testID="edit-name-close"
                >
                  <X size={20} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                ref={nameInputRef}
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your username"
                placeholderTextColor={Colors.dark.textTertiary}
                maxLength={30}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                testID="edit-name-input"
              />

              <Text style={styles.charCount}>{newName.length}/30</Text>

              <Pressable
                style={[styles.saveBtn, savingName && styles.saveBtnDisabled]}
                onPress={handleSaveName}
                disabled={savingName}
                testID="edit-name-save"
              >
                {savingName ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  profileSection: {},
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: Colors.dark.text,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.dark.coral,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.coral,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  name: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  editNameIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statsGridSecond: {
    marginBottom: 6,
  },
  disagreementLine: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  popularCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 217, 61, 0.25)",
  },
  popularContent: {
    flex: 1,
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  popularSubtitle: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.dark.goldDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 217, 61, 0.3)",
  },
  badgeContent: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    marginBottom: 2,
  },
  badgeSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  friendsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  friendsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  friendsTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  friendsSubtitle: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  settingsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  settingsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  adminRow: {
    borderColor: "rgba(255, 107, 107, 0.2)",
    backgroundColor: "rgba(255, 107, 107, 0.06)",
  },
  settingsRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  signOutRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.error,
  },
  emailText: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: "center" as const,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalCard: {
    width: "85%" as const,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.surfaceHighlight,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  nameInput: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  charCount: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: "right" as const,
    marginTop: 6,
    marginBottom: 16,
  },
  saveBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: Colors.dark.coral,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
  },
});

