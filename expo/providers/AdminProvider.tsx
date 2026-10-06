import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

export interface AdminSettings {
  adsEnabled: boolean;
  debateTopicCharLimit: number;
  argumentCharLimit: number;
  debateTimeframeDays: number;
  moderationEnabled: boolean;
}

// ADS ENABLED defaults to OFF per product spec — ads only exist when an
// admin explicitly turns them on in app_settings (DB is authoritative).
const DEFAULT_SETTINGS: AdminSettings = {
  adsEnabled: false,
  debateTopicCharLimit: 500,
  argumentCharLimit: 500,
  debateTimeframeDays: 7,
  moderationEnabled: true,
};

export const [AdminProvider, useAdmin] = createContextHook(() => {
  /* eslint-disable rork/general-context-optimization */
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  const adminCheckQuery = useQuery({
    queryKey: ["admin-check", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return false;
      console.log("[Admin] Checking is_admin in profiles for:", user.id);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data && data.is_admin === true) {
          console.log("[Admin] User is admin via profiles.is_admin");
          return true;
        }
      } catch (err) {
        console.log("[Admin] Supabase admin check failed (non-critical):", err);
      }

      return false;
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    queryFn: async () => {
      console.log("[Admin] Loading admin settings from Supabase...");
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("*")
          .eq("key", "admin_settings")
          .maybeSingle();
        if (data && !error && data.value) {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          console.log("[Admin] Loaded settings from Supabase:", JSON.stringify(parsed));
          return { ...DEFAULT_SETTINGS, ...parsed } as AdminSettings;
        }
        if (error) {
          console.log("[Admin] Supabase settings fetch error:", error.message);
        }
      } catch (err) {
        console.log("[Admin] Supabase settings load failed:", err);
      }
      console.log("[Admin] Using default settings");
      return DEFAULT_SETTINGS;
    },
  });

  useEffect(() => {
    if (adminCheckQuery.data !== undefined) {
      setIsAdmin(adminCheckQuery.data);
      console.log("[Admin] Is admin:", adminCheckQuery.data);
    }
  }, [adminCheckQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!isAuthenticated) return;

    console.log("[Admin Realtime] Setting up app_settings subscription...");
    const channel = supabase
      .channel("admin_settings_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          console.log("[Admin Realtime] app_settings changed:", payload.eventType);
          void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
        }
      )
      .subscribe((status) => {
        console.log("[Admin Realtime] Subscription status:", status);
      });

    return () => {
      console.log("[Admin Realtime] Removing channel");
      void supabase.removeChannel(channel);
    };
  }, [queryClient, isAuthenticated]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: AdminSettings) => {
      console.log("[Admin] Saving settings to Supabase:", JSON.stringify(newSettings));

      const { data: existing } = await supabase
        .from("app_settings")
        .select("key")
        .eq("key", "admin_settings")
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from("app_settings")
          .update({ value: newSettings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq("key", "admin_settings");
        error = result.error;
      } else {
        const result = await supabase
          .from("app_settings")
          .insert({ key: "admin_settings", value: newSettings as unknown as Record<string, unknown> });
        error = result.error;
      }

      if (error) {
        console.log("[Admin] Supabase settings save error:", error.message);
        Alert.alert("Save Failed", "Could not save settings: " + error.message);
        throw new Error(error.message);
      }

      console.log("[Admin] Settings saved to Supabase successfully");
      return newSettings;
    },
    onSuccess: (newSettings) => {
      setSettings(newSettings);
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err) => {
      console.log("[Admin] Save settings mutation error:", err.message);
    },
  });

  const updateSettings = useCallback(
    (partial: Partial<AdminSettings>) => {
      const newSettings = { ...settings, ...partial };
      setSettings(newSettings);
      saveSettingsMutation.mutate(newSettings);
    },
    [settings, saveSettingsMutation]
  );

  const refreshAdminStatus = useCallback(() => {
    console.log("[Admin] Refreshing admin status");
    void queryClient.invalidateQueries({ queryKey: ["admin-check"] });
  }, [queryClient]);

  const deleteDecisionMutation = useMutation({
    mutationFn: async (decisionId: string) => {
      if (!isAdmin) {
        throw new Error("Not authorized");
      }
      console.log("[Admin] Deleting decision and related data:", decisionId);

      const deleteRelated = async (table: string, column: string) => {
        try {
          const { error } = await supabase.from(table).delete().eq(column, decisionId);
          if (error) console.log(`[Admin] Delete from ${table} warning:`, error.message);
          else console.log(`[Admin] Deleted related rows from ${table}`);
        } catch (err) {
          console.log(`[Admin] Delete from ${table} non-critical error:`, err);
        }
      };

      await deleteRelated("comments", "decision_id");
      await deleteRelated("decision_likes", "decision_id");
      await deleteRelated("user_votes", "decision_id");
      await deleteRelated("activities", "decision_id");

      const { error } = await supabase.from("decisions").delete().eq("id", decisionId);
      if (error) {
        console.log("[Admin] Delete decision failed:", error.message);
        throw new Error(error.message);
      }

      console.log("[Admin] Decision deleted successfully:", decisionId);
      return decisionId;
    },
    onSuccess: (decisionId) => {
      console.log("[Admin] Invalidating queries after delete:", decisionId);
      void queryClient.invalidateQueries({ queryKey: ["decisions"] });
      void queryClient.invalidateQueries({ queryKey: ["decision_likes"] });
      void queryClient.invalidateQueries({ queryKey: ["all_comments"] });
      void queryClient.invalidateQueries({ queryKey: ["votes"] });
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (err) => {
      console.log("[Admin] Delete mutation error:", err.message);
      Alert.alert("Delete Failed", err.message);
    },
  });

  const deleteDecision = useCallback(
    (decisionId: string) => {
      deleteDecisionMutation.mutate(decisionId);
    },
    [deleteDecisionMutation]
  );

  const deleteArgument = useCallback(
    async (decisionId: string, side: "a" | "b") => {
      if (!isAdmin) {
        console.log("[Admin] Not admin, cannot delete argument");
        return;
      }
      console.log("[Admin] Deleting argument side", side, "from decision:", decisionId);

      const updatePayload: Record<string, unknown> = {};
      if (side === "a") {
        updatePayload.side_a = null;
        updatePayload.side_a_contributor = null;
      } else {
        updatePayload.side_b = null;
        updatePayload.side_b_contributor = null;
      }

      updatePayload.status = "open_one_side";
      updatePayload.ai_judgment = null;
      updatePayload.ai_pending = false;

      const { error } = await supabase
        .from("decisions")
        .update(updatePayload)
        .eq("id", decisionId);

      if (error) {
        console.log("[Admin] Delete argument failed:", error.message);
        Alert.alert("Delete Failed", error.message);
        return;
      }

      console.log("[Admin] Argument deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["decisions"] });
    },
    [isAdmin, queryClient]
  );

  return useMemo(() => ({
    isAdmin,
    settings,
    updateSettings,
    refreshAdminStatus,
    deleteDecision,
    deleteArgument,
    isSavingSettings: saveSettingsMutation.isPending,
    isDeletingDecision: deleteDecisionMutation.isPending,
  }), [isAdmin, settings, updateSettings, refreshAdminStatus, deleteDecision, deleteArgument, saveSettingsMutation.isPending, deleteDecisionMutation.isPending]);
});
