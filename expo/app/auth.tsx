import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Mail, Lock, User, Eye, EyeOff, Gavel } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

type AuthMode = "signin" | "signup";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInError, signUpError, isSigningIn, isSigningUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const gavelAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    console.log("[Auth] Screen mounted");
    Animated.loop(
      Animated.sequence([
        Animated.timing(gavelAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(gavelAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [gavelAnim]);

  const gavelRotate = gavelAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-5deg", "5deg", "-5deg"],
  });

  const handleSubmit = useCallback(() => {
    if (!email.trim() || !password.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("[Auth] Submit pressed, mode:", mode, "email:", email.trim());
    if (mode === "signin") {
      signIn(email.trim(), password);
    } else {
      if (!displayName.trim()) return;
      signUp(email.trim(), password, displayName.trim());
    }
  }, [mode, email, password, displayName, signIn, signUp]);

  const toggleMode = useCallback(() => {
    void Haptics.selectionAsync();
    setMode((m) => (m === "signin" ? "signup" : "signin"));
  }, []);

  const error = mode === "signin" ? signInError : signUpError;
  const isLoading = mode === "signin" ? isSigningIn : isSigningUp;

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length >= 6 &&
    (mode === "signin" || displayName.trim().length > 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Animated.View style={[styles.gavelIcon, { transform: [{ rotate: gavelRotate }] }]}>
            <Gavel size={48} color={Colors.dark.coral} />
          </Animated.View>
          <Text style={styles.appName}>Decidr</Text>
          <Text style={styles.tagline}>Settle arguments. Get the verdict.</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, mode === "signin" && styles.tabActive]}
              onPress={() => { setMode("signin"); void Haptics.selectionAsync(); }}
              testID="auth-tab-signin"
            >
              <Text style={[styles.tabText, mode === "signin" && styles.tabTextActive]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === "signup" && styles.tabActive]}
              onPress={() => { setMode("signup"); void Haptics.selectionAsync(); }}
              testID="auth-tab-signup"
            >
              <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          {mode === "signup" && (
            <View style={styles.inputContainer}>
              <User size={18} color={Colors.dark.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                placeholderTextColor={Colors.dark.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                testID="display-name-input"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Mail size={18} color={Colors.dark.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.dark.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-input"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={18} color={Colors.dark.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={Colors.dark.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              testID="password-input"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              {showPassword ? (
                <EyeOff size={18} color={Colors.dark.textTertiary} />
              ) : (
                <Eye size={18} color={Colors.dark.textTertiary} />
              )}
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isLoading}
            testID="auth-submit-btn"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={toggleMode} style={styles.switchRow} testID="auth-toggle-mode">
            <Text style={styles.switchText}>
              {mode === "signin"
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={styles.switchLink}>
                {mode === "signin" ? "Sign Up" : "Sign In"}
              </Text>
            </Text>
          </Pressable>
        </View>

        <Text style={styles.legalNote}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  gavelIcon: {
    marginBottom: 16,
  },
  appName: {
    fontSize: 40,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    fontWeight: "500" as const,
  },
  formContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: Colors.dark.surface,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.textTertiary,
  },
  tabTextActive: {
    color: Colors.dark.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
    padding: 0,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 13,
    fontWeight: "500" as const,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: Colors.dark.coral,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  switchRow: {
    alignItems: "center",
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  switchLink: {
    color: Colors.dark.coral,
    fontWeight: "600" as const,
  },
  legalNote: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
  },
});

