import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { DecisionProvider } from "@/providers/DecisionProvider";
import { AdminProvider } from "@/providers/AdminProvider";
import { SocialProvider } from "@/providers/SocialProvider";
import Colors from "@/constants/colors";

void SplashScreen.preventAutoHideAsync();

// Shared debate URLs use the /debate/<id> path — expo-router serves the same
// DecisionDetailScreen for both /decision/[id] and /debate/[id] (see
// app/debate/[id].tsx), so a shared link opens the real debate with the
// existing vote-before-AI-reveal rules and never creates a duplicate.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === "auth";
    const inLegalScreen = segments[0] === "terms" || segments[0] === "privacy" || segments[0] === "eula" || segments[0] === "support";

    if (!isAuthenticated && !inAuthScreen && !inLegalScreen) {
      console.log("[AuthGate] Not authenticated, redirecting to auth");
      router.replace("/auth");
    } else if (isAuthenticated && inAuthScreen) {
      console.log("[AuthGate] Authenticated, redirecting to home");
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.coral} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
          contentStyle: { backgroundColor: Colors.dark.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="create" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="decision/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="contribute/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ title: "Terms of Service" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy Policy" }} />
        <Stack.Screen name="eula" options={{ title: "EULA" }} />
        <Stack.Screen name="support" options={{ title: "Support" }} />
        <Stack.Screen name="admin" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="friends" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
        <Stack.Screen name="saved" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="debate/[id]" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("[App] Root layout mounted");
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.dark.background }}>
        <StatusBar style="light" />
        <AuthProvider>
          <DecisionProvider>
            <AdminProvider>
              <SocialProvider>
                <RootLayoutNav />
              </SocialProvider>
            </AdminProvider>
          </DecisionProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
});

