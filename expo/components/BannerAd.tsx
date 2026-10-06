import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAdmin } from "@/providers/AdminProvider";
import { AdSlot } from "@/components/AdSlot";

interface BannerAdProps {
  placement?: "home" | "discover" | "detail";
}

const AD_CONTENT = [
  {
    text: "Upgrade to Decidr Pro — No ads, exclusive badges!",
    cta: "Learn More",
    color: Colors.dark.coral,
    bg: "rgba(255, 107, 107, 0.08)",
    borderColor: "rgba(255, 107, 107, 0.15)",
  },
  {
    text: "Share Decidr with friends and earn rewards",
    cta: "Invite",
    color: Colors.dark.cyan,
    bg: "rgba(78, 205, 196, 0.08)",
    borderColor: "rgba(78, 205, 196, 0.15)",
  },
  {
    text: "Got a hot take? Create a debate and let the crowd decide",
    cta: "Create",
    color: Colors.dark.gold,
    bg: "rgba(255, 217, 61, 0.06)",
    borderColor: "rgba(255, 217, 61, 0.15)",
  },
];

function BannerAdComponent({ placement = "home" }: BannerAdProps) {
  const { settings } = useAdmin();
  const [dismissed, setDismissed] = useState(false);
  const [adIndex] = useState(() => Math.floor(Math.random() * AD_CONTENT.length));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (settings.adsEnabled && !dismissed) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [settings.adsEnabled, dismissed, fadeAnim, slideAnim]);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setDismissed(true));
  }, [fadeAnim, slideAnim]);

  if (dismissed) {
    return null;
  }

  const ad = AD_CONTENT[adIndex];

  // AdSlot renders nothing at all when ADS ENABLED is OFF — no reserved
  // space, no empty box, no layout shift.
  return (
    <AdSlot placement={placement}>
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: ad.bg,
          borderColor: ad.borderColor,
        },
      ]}
      testID={`banner-ad-${placement}`}
    >
      <View style={styles.adLabel}>
        <Text style={styles.adLabelText}>AD</Text>
      </View>
      <Text style={[styles.adText, { color: Colors.dark.textSecondary }]} numberOfLines={2}>
        {ad.text}
      </Text>
      <Pressable
        style={[styles.ctaButton, { backgroundColor: ad.color }]}
        onPress={() => {
          console.log("[Ad] CTA pressed:", ad.cta);
        }}
        testID={`ad-cta-${placement}`}
      >
        <Text style={styles.ctaText}>{ad.cta}</Text>
      </Pressable>
      <Pressable
        style={styles.dismissBtn}
        onPress={handleDismiss}
        hitSlop={8}
        testID={`ad-dismiss-${placement}`}
      >
        <X size={14} color={Colors.dark.textTertiary} />
      </Pressable>
    </Animated.View>
    </AdSlot>
  );
}

export const BannerAd = React.memo(BannerAdComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  adLabel: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  adLabelText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.dark.textTertiary,
    letterSpacing: 0.5,
  },
  adText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
  },
  ctaButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  dismissBtn: {
    padding: 4,
  },
});
