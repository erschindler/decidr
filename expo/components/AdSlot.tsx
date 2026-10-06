import React from "react";
import { View } from "react-native";
import { useAdmin } from "@/providers/AdminProvider";

interface AdSlotProps {
  placement: "home" | "discover" | "detail" | "profile";
  children?: React.ReactNode;
}

/**
 * Reusable ad-slot gate. When the admin's ADS ENABLED setting is OFF the
 * slot renders nothing at all — no reserved space, no empty box, no layout
 * shift. When ON, children become eligible to render an ad. A real ad
 * provider can later be passed in as children without touching screens.
 */
function AdSlotComponent({ placement, children }: AdSlotProps) {
  const { settings } = useAdmin();
  if (!settings.adsEnabled) return null;
  return <View testID={`ad-slot-${placement}`}>{children}</View>;
}

export const AdSlot = React.memo(AdSlotComponent);
