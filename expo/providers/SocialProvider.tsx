import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase, resolveAvatarUrl } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  Comment,
  Friendship,
  FriendshipStatus,
  ActivityItem,
  PublicProfile,
} from "@/types/social";
import { AppNotification, Decision } from "@/types/decision";
import { useDecisions } from "@/providers/DecisionProvider";

export interface CachedProfile {
  id: string;
  name: string;
  avatar: string;
}

export const [SocialProvider, useSocial] = createContextHook(() => {
  /* eslint-disable rork/general-context-optimization */
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id ?? null;
  const displayName = (user?.user_metadata?.display_name as string) ?? "You";

  const [likedDecisionIds, setLikedDecisionIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [profilesCache, setProfilesCache] = useState<Record<string, CachedProfile>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedEntries, setSavedEntries] = useState<Array<{ decisionId: string; savedAt: string }>>([]);

  const getCurrentUserAvatar = useCallback((): string => {
    if (currentUserId && profilesCache[currentUserId]) {
      return profilesCache[currentUserId].avatar;
    }
    return user?.user_metadata?.avatar_url ?? "";
  }, [currentUserId, profilesCache, user?.user_metadata?.avatar_url]);

  const getCurrentUserName = useCallback((): string => {
    if (currentUserId && profilesCache[currentUserId]) {
      return profilesCache[currentUserId].name;
    }
    return displayName;
  }, [currentUserId, profilesCache, displayName]);

  const profilesCacheQuery = useQuery({
    queryKey: ["profiles_cache"],
    enabled: isAuthenticated,
    queryFn: async () => {
      console.log("[Social] Fetching all profiles for cache...");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url");

      if (error) {
        console.log("[Social] Profiles cache fetch error:", error.message);
        return {} as Record<string, CachedProfile>;
      }

      const cache: Record<string, CachedProfile> = {};
      const resolvePromises = (data ?? []).map(async (row: any) => {
        const id = String(row.id);
        const fallback = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(row.display_name ?? "U")}&backgroundColor=FF6B6B`;
        let avatar = fallback;
        if (row.avatar_url) {
          const resolved = await resolveAvatarUrl(row.avatar_url);
          avatar = resolved || fallback;
        }
        cache[id] = {
          id,
          name: String(row.display_name ?? "User"),
          avatar,
        };
      });
      await Promise.all(resolvePromises);
      console.log("[Social] Cached", Object.keys(cache).length, "profiles");
      return cache;
    },
  });

  useEffect(() => {
    if (profilesCacheQuery.data) setProfilesCache(profilesCacheQuery.data);
  }, [profilesCacheQuery.data]);

  const getProfileById = useCallback(
    (userId: string): CachedProfile => {
      if (profilesCache[userId]) return profilesCache[userId];
      return {
        id: userId,
        name: "User",
        avatar: `https://api.dicebear.com/7.x/initials/png?seed=U&backgroundColor=FF6B6B`,
      };
    },
    [profilesCache]
  );

  const likesQuery = useQuery({
    queryKey: ["decision_likes", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return { userLikes: new Set<string>(), counts: {} as Record<string, number> };
      console.log("[Social] Fetching likes...");
      const { data: userLikesData, error: userLikesError } = await supabase
        .from("decision_likes")
        .select("decision_id")
        .eq("user_id", currentUserId);

      if (userLikesError) {
        console.log("[Social] User likes fetch error:", userLikesError.message);
      }

      const userLikes = new Set<string>(
        (userLikesData ?? []).map((r: { decision_id: string }) => r.decision_id)
      );

      const { data: countsData, error: countsError } = await supabase
        .from("decision_likes")
        .select("decision_id");

      if (countsError) {
        console.log("[Social] Like counts fetch error:", countsError.message);
      }

      const counts: Record<string, number> = {};
      (countsData ?? []).forEach((r: { decision_id: string }) => {
        counts[r.decision_id] = (counts[r.decision_id] ?? 0) + 1;
      });

      console.log("[Social] Fetched likes:", userLikes.size, "user likes,", Object.keys(counts).length, "decisions with likes");
      return { userLikes, counts };
    },
  });

  const friendshipsQuery = useQuery({
    queryKey: ["friendships", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [];
      console.log("[Social] Fetching friendships...");
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

      if (error) {
        console.log("[Social] Friendships fetch error:", error.message);
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Friendship[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        requesterId: String(row.requester_id),
        requesterName: String(row.requester_name ?? "User"),
        requesterAvatar: String(row.requester_avatar ?? ""),
        recipientId: String(row.recipient_id),
        recipientName: String(row.recipient_name ?? "User"),
        recipientAvatar: String(row.recipient_avatar ?? ""),
        status: (row.status as FriendshipStatus) ?? "pending",
        createdAt: String(row.created_at ?? ""),
      }));

      console.log("[Social] Fetched", mapped.length, "friendships");
      return mapped;
    },
  });

  const activitiesQuery = useQuery({
    queryKey: ["activities", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [];
      console.log("[Social] Fetching activities...");
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .or(`user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.log("[Social] Activities fetch error:", error.message);
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: ActivityItem[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        type: row.type as ActivityItem["type"],
        userId: String(row.user_id),
        userName: String(row.user_name ?? "User"),
        userAvatar: String(row.user_avatar ?? ""),
        decisionId: row.decision_id ? String(row.decision_id) : undefined,
        decisionTitle: row.decision_title ? String(row.decision_title) : undefined,
        commentText: row.comment_text ? String(row.comment_text) : undefined,
        createdAt: String(row.created_at ?? ""),
      }));

      console.log("[Social] Fetched", mapped.length, "activities");
      return mapped;
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["all_comments"],
    enabled: isAuthenticated,
    queryFn: async () => {
      console.log("[Social] Fetching comments...");
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.log("[Social] Comments fetch error:", error.message);
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Comment[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        userId: String(row.user_id),
        userName: String(row.user_name ?? "User"),
        userAvatar: String(row.user_avatar ?? ""),
        decisionId: String(row.decision_id),
        text: String(row.text ?? ""),
        createdAt: String(row.created_at ?? ""),
        parentId: row.parent_id ? String(row.parent_id) : null,
        likesCount: Number(row.likes_count ?? 0),
      }));

      console.log("[Social] Fetched", mapped.length, "comments");
      return mapped;
    },
  });

  const savedQuery = useQuery({
    queryKey: ["saved_debates", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [] as Array<{ decisionId: string; savedAt: string }>;
      console.log("[Social] Fetching saved debates...");
      const { data, error } = await supabase
        .from("saved_debates")
        .select("decision_id, created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (error) {
        console.log("[Social] Saved debates fetch error:", error.message);
        return [] as Array<{ decisionId: string; savedAt: string }>;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any) => ({
        decisionId: String(row.decision_id),
        savedAt: String(row.created_at ?? ""),
      }));
    },
  });

  const mySharesQuery = useQuery({
    queryKey: ["my_shares", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [] as string[];
      const { data, error } = await supabase
        .from("decision_shares")
        .select("decision_id")
        .eq("user_id", currentUserId);
      if (error) {
        console.log("[Social] Shares fetch error:", error.message);
        return [] as string[];
      }
      // One row per user/decision/method — distinct debates shared by this user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Array.from(new Set((data ?? []).map((row: any) => String(row.decision_id))));
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [] as AppNotification[];
      console.log("[Social] Fetching notifications...");
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.log("[Social] Notifications fetch error:", error.message);
        return [] as AppNotification[];
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any): AppNotification => ({
        id: String(row.id),
        type: row.type as AppNotification["type"],
        title: String(row.title ?? ""),
        body: row.body ? String(row.body) : null,
        actorId: row.actor_id ? String(row.actor_id) : null,
        decisionId: row.decision_id ? String(row.decision_id) : null,
        isRead: Boolean(row.is_read),
        createdAt: String(row.created_at ?? ""),
      }));
    },
  });

  useEffect(() => {
    if (likesQuery.data) {
      setLikedDecisionIds(likesQuery.data.userLikes);
      setLikeCounts(likesQuery.data.counts);
    }
  }, [likesQuery.data]);

  useEffect(() => {
    if (friendshipsQuery.data) setFriendships(friendshipsQuery.data);
  }, [friendshipsQuery.data]);

  useEffect(() => {
    if (activitiesQuery.data) setActivities(activitiesQuery.data);
  }, [activitiesQuery.data]);

  useEffect(() => {
    if (savedQuery.data) {
      setSavedEntries(savedQuery.data);
      setSavedIds(new Set(savedQuery.data.map((s) => s.decisionId)));
    }
  }, [savedQuery.data]);

  useEffect(() => {
    if (!isAuthenticated) return;

    console.log("[Social Realtime] Setting up subscriptions...");
    const channel = supabase
      .channel("social_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "decision_likes" }, () => {
        console.log("[Social Realtime] Likes changed");
        void queryClient.invalidateQueries({ queryKey: ["decision_likes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        console.log("[Social Realtime] Comments changed");
        void queryClient.invalidateQueries({ queryKey: ["all_comments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        console.log("[Social Realtime] Friendships changed");
        void queryClient.invalidateQueries({ queryKey: ["friendships"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities" }, () => {
        console.log("[Social Realtime] New activity");
        void queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        console.log("[Social Realtime] Profiles changed");
        void queryClient.invalidateQueries({ queryKey: ["profiles_cache"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        console.log("[Social Realtime] New notification");
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_debates" }, () => {
        console.log("[Social Realtime] Saved debates changed");
        void queryClient.invalidateQueries({ queryKey: ["saved_debates"] });
      })
      .subscribe((status) => {
        console.log("[Social Realtime] Status:", status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, isAuthenticated]);

  const toggleLikeMutation = useMutation({
    mutationFn: async (decisionId: string) => {
      if (!currentUserId) throw new Error("Not authenticated");
      const isLiked = likedDecisionIds.has(decisionId);

      if (isLiked) {
        console.log("[Social] Unliking decision:", decisionId);
        const { error } = await supabase
          .from("decision_likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("decision_id", decisionId);
        if (error) throw new Error(error.message);
        return { decisionId, liked: false };
      } else {
        console.log("[Social] Liking decision:", decisionId);
        const { error } = await supabase
          .from("decision_likes")
          .insert({ user_id: currentUserId, decision_id: decisionId });
        if (error) throw new Error(error.message);

        try {
          await supabase.from("activities").insert({
            type: "like",
            user_id: currentUserId,
            user_name: getCurrentUserName(),
            user_avatar: getCurrentUserAvatar(),
            decision_id: decisionId,
          });
        } catch (e) {
          console.log("[Social] Activity insert failed (non-critical):", e);
        }

        return { decisionId, liked: true };
      }
    },
    onMutate: async (decisionId) => {
      const isLiked = likedDecisionIds.has(decisionId);
      setLikedDecisionIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(decisionId);
        else next.add(decisionId);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [decisionId]: (prev[decisionId] ?? 0) + (isLiked ? -1 : 1),
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["decision_likes"] });
    },
    onError: (_, decisionId) => {
      const isLiked = likedDecisionIds.has(decisionId);
      setLikedDecisionIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(decisionId);
        else next.add(decisionId);
        return next;
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({
      decisionId,
      text,
      parentId,
    }: {
      decisionId: string;
      text: string;
      parentId?: string;
    }) => {
      if (!currentUserId) throw new Error("Not authenticated");
      console.log("[Social] Adding comment to decision:", decisionId);

      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: currentUserId,
          user_name: getCurrentUserName(),
          user_avatar: getCurrentUserAvatar(),
          decision_id: decisionId,
          text,
          parent_id: parentId ?? null,
          likes_count: 0,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      try {
        await supabase.from("activities").insert({
          type: "comment",
          user_id: currentUserId,
          user_name: getCurrentUserName(),
          user_avatar: getCurrentUserAvatar(),
          decision_id: decisionId,
          comment_text: text.slice(0, 100),
        });
      } catch (e) {
        console.log("[Social] Activity insert failed (non-critical):", e);
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["all_comments"] });
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async ({
      recipientId,
      recipientName,
      recipientAvatar,
    }: {
      recipientId: string;
      recipientName: string;
      recipientAvatar: string;
    }) => {
      if (!currentUserId) throw new Error("Not authenticated");
      console.log("[Social] Sending friend request to:", recipientId);

      const { data: existingRows, error: existingError } = await supabase
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${currentUserId})`
        );

      if (existingError) {
        console.log("[Social] Error checking existing friendships:", existingError.message);
      }

      if (existingRows && existingRows.length > 0) {
        const activeRow = existingRows.find(
          (r: { status: string }) => r.status === "pending" || r.status === "accepted"
        );
        if (activeRow) {
          console.log("[Social] Active friendship already exists, skipping");
          throw new Error("Friend request already exists");
        }

        console.log("[Social] Cleaning up old rejected friendships");
        for (const row of existingRows) {
          const { error: delErr } = await supabase.from("friendships").delete().eq("id", row.id);
          if (delErr) console.log("[Social] Failed to delete old friendship:", delErr.message);
        }
      }

      const requesterAvatar = user?.user_metadata?.avatar_url ?? "";

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", currentUserId)
        .single();

      const finalRequesterName = profileData?.display_name ?? displayName;
      const finalRequesterAvatar = profileData?.avatar_url ?? requesterAvatar;

      console.log("[Social] Inserting friendship row...");
      const { data, error } = await supabase
        .from("friendships")
        .insert({
          requester_id: currentUserId,
          requester_name: finalRequesterName,
          requester_avatar: finalRequesterAvatar,
          recipient_id: recipientId,
          recipient_name: recipientName,
          recipient_avatar: recipientAvatar,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.log("[Social] Friend request insert error:", error.message, error.details, error.hint);
        throw new Error(error.message);
      }

      console.log("[Social] Friend request sent successfully, id:", data?.id);

      try {
        await supabase.from("activities").insert({
          type: "friend_request",
          user_id: currentUserId,
          user_name: finalRequesterName,
          user_avatar: finalRequesterAvatar,
          target_user_id: recipientId,
        });
      } catch (e) {
        console.log("[Social] Activity insert failed (non-critical):", e);
      }

      return data;
    },
    onSuccess: () => {
      console.log("[Social] Friend request mutation success, invalidating queries");
      void queryClient.invalidateQueries({ queryKey: ["friendships"] });
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (error: Error) => {
      console.log("[Social] Friend request mutation error:", error.message);
    },
  });

  const respondFriendRequestMutation = useMutation({
    mutationFn: async ({
      friendshipId,
      accept,
    }: {
      friendshipId: string;
      accept: boolean;
    }) => {
      if (!currentUserId) throw new Error("Not authenticated");
      console.log("[Social] Responding to friend request:", friendshipId, accept ? "accept" : "reject");

      const newStatus = accept ? "accepted" : "rejected";
      const { data: updateData, error } = await supabase
        .from("friendships")
        .update({ status: newStatus })
        .eq("id", friendshipId)
        .select()
        .single();

      if (error) {
        console.log("[Social] Respond error:", error.message, error.details, error.hint);
        throw new Error(error.message);
      }

      console.log("[Social] Friendship updated to:", newStatus, "row:", updateData?.id);

      if (accept) {
        try {
          await supabase.from("activities").insert({
            type: "friend_accepted",
            user_id: currentUserId,
            user_name: getCurrentUserName(),
            user_avatar: getCurrentUserAvatar(),
          });
        } catch (e) {
          console.log("[Social] Activity insert failed (non-critical):", e);
        }
      }

      return { friendshipId, accept };
    },
    onSuccess: (result) => {
      console.log("[Social] Respond mutation success:", result.accept ? "accepted" : "rejected");
      void queryClient.invalidateQueries({ queryKey: ["friendships"] });
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (error: Error) => {
      console.log("[Social] Respond mutation error:", error.message);
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!currentUserId) throw new Error("Not authenticated");
      console.log("[Social] Removing friendship:", friendshipId);
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) {
        console.log("[Social] Remove friendship error:", error.message, error.details, error.hint);
        throw new Error(error.message);
      }
      console.log("[Social] Friendship removed successfully:", friendshipId);
    },
    onSuccess: () => {
      console.log("[Social] Remove mutation success, invalidating queries");
      void queryClient.invalidateQueries({ queryKey: ["friendships"] });
    },
    onError: (error: Error) => {
      console.log("[Social] Remove mutation error:", error.message);
    },
  });

  const toggleSaveMutation = useMutation({
    mutationFn: async (decisionId: string) => {
      if (!currentUserId) throw new Error("Not authenticated");
      const wasSaved = savedIds.has(decisionId);
      if (wasSaved) {
        console.log("[Social] Unsaving decision:", decisionId);
        const { error } = await supabase
          .from("saved_debates")
          .delete()
          .eq("user_id", currentUserId)
          .eq("decision_id", decisionId);
        if (error) throw new Error(error.message);
        return { decisionId, saved: false };
      }
      console.log("[Social] Saving decision:", decisionId);
      const { error } = await supabase
        .from("saved_debates")
        .insert({ user_id: currentUserId, decision_id: decisionId });
      if (error) throw new Error(error.message);
      return { decisionId, saved: true };
    },
    onMutate: (decisionId: string) => {
      const wasSaved = savedIds.has(decisionId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) {
          next.delete(decisionId);
        } else {
          next.add(decisionId);
        }
        return next;
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved_debates"] });
    },
    onError: (_err: Error, decisionId: string) => {
      // Revert optimistic update
      const isCurrentlySaved = savedIds.has(decisionId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) {
          next.delete(decisionId);
        } else {
          next.add(decisionId);
        }
        return next;
      });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw new Error(error.message);
      return notificationId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const toggleLike = useCallback(
    (decisionId: string) => {
      toggleLikeMutation.mutate(decisionId);
    },
    [toggleLikeMutation]
  );

  const addComment = useCallback(
    (decisionId: string, text: string, parentId?: string) => {
      addCommentMutation.mutate({ decisionId, text, parentId });
    },
    [addCommentMutation]
  );

  const sendFriendRequest = useCallback(
    (recipientId: string, recipientName: string, recipientAvatar: string) => {
      console.log("[Social] sendFriendRequest called for:", recipientId, recipientName);
      sendFriendRequestMutation.mutate(
        { recipientId, recipientName, recipientAvatar },
        {
          onSuccess: () => {
            console.log("[Social] Friend request callback: success");
          },
          onError: (err) => {
            console.log("[Social] Friend request callback: error -", err.message);
          },
        }
      );
    },
    [sendFriendRequestMutation]
  );

  const respondToFriendRequest = useCallback(
    (friendshipId: string, accept: boolean) => {
      console.log("[Social] respondToFriendRequest called:", friendshipId, accept);
      respondFriendRequestMutation.mutate(
        { friendshipId, accept },
        {
          onSuccess: () => {
            console.log("[Social] Respond callback: success");
          },
          onError: (err) => {
            console.log("[Social] Respond callback: error -", err.message);
          },
        }
      );
    },
    [respondFriendRequestMutation]
  );

  const removeFriend = useCallback(
    (friendshipId: string) => {
      console.log("[Social] removeFriend called:", friendshipId);
      removeFriendMutation.mutate(friendshipId, {
        onSuccess: () => {
          console.log("[Social] Remove callback: success");
        },
        onError: (err) => {
          console.log("[Social] Remove callback: error -", err.message);
        },
      });
    },
    [removeFriendMutation]
  );

  const isLiked = useCallback(
    (decisionId: string) => likedDecisionIds.has(decisionId),
    [likedDecisionIds]
  );

  const isSaved = useCallback(
    (decisionId: string) => savedIds.has(decisionId),
    [savedIds]
  );

  const toggleSave = useCallback(
    (decisionId: string) => {
      toggleSaveMutation.mutate(decisionId);
    },
    [toggleSaveMutation]
  );

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      markNotificationReadMutation.mutate(notificationId);
    },
    [markNotificationReadMutation]
  );

  const markAllNotificationsRead = useCallback(() => {
    markAllNotificationsReadMutation.mutate();
  }, [markAllNotificationsReadMutation]);

  const getLikeCount = useCallback(
    (decisionId: string) => likeCounts[decisionId] ?? 0,
    [likeCounts]
  );

  const getCommentsForDecision = useCallback(
    (decisionId: string) => {
      return (commentsQuery.data ?? []).filter((c) => c.decisionId === decisionId);
    },
    [commentsQuery.data]
  );

  const acceptedFriends = useMemo(
    () => friendships.filter((f) => f.status === "accepted"),
    [friendships]
  );

  const pendingRequests = useMemo(
    () =>
      friendships.filter(
        (f) => f.status === "pending" && f.recipientId === currentUserId
      ),
    [friendships, currentUserId]
  );

  const sentRequests = useMemo(
    () =>
      friendships.filter(
        (f) => f.status === "pending" && f.requesterId === currentUserId
      ),
    [friendships, currentUserId]
  );

  const getFriendshipWith = useCallback(
    (userId: string) => {
      return friendships.find(
        (f) =>
          (f.requesterId === userId || f.recipientId === userId) &&
          (f.requesterId === currentUserId || f.recipientId === currentUserId) &&
          f.status !== "rejected"
      );
    },
    [friendships, currentUserId]
  );

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const debatesShared = mySharesQuery.data?.length ?? 0;

  const friendIds = useMemo(
    () =>
      acceptedFriends.map((f) =>
        f.requesterId === currentUserId ? f.recipientId : f.requesterId
      ),
    [acceptedFriends, currentUserId]
  );

  const refreshSocial = useCallback(() => {
    console.log("[Social] Refreshing all social data...");
    void queryClient.invalidateQueries({ queryKey: ["decision_likes"] });
    void queryClient.invalidateQueries({ queryKey: ["all_comments"] });
    void queryClient.invalidateQueries({ queryKey: ["friendships"] });
    void queryClient.invalidateQueries({ queryKey: ["activities"] });
    void queryClient.invalidateQueries({ queryKey: ["profiles_cache"] });
    void queryClient.invalidateQueries({ queryKey: ["saved_debates"] });
    void queryClient.invalidateQueries({ queryKey: ["my_shares"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const isLoading =
    likesQuery.isLoading ||
    friendshipsQuery.isLoading ||
    commentsQuery.isLoading;

  return {
    likedDecisionIds,
    likeCounts,
    friendships,
    acceptedFriends,
    pendingRequests,
    sentRequests,
    activities,
    notifications,
    unreadCount,
    savedIds,
    savedEntries,
    debatesShared,
    friendIds,
    isLoading,
    toggleLike,
    isLiked,
    getLikeCount,
    getProfileById,
    addComment,
    getCommentsForDecision,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    getFriendshipWith,
    isSaved,
    toggleSave,
    markNotificationRead,
    markAllNotificationsRead,
    refreshSocial,
    isAddingComment: addCommentMutation.isPending,
    isSendingFriendRequest: sendFriendRequestMutation.isPending,
    isTogglingSave: toggleSaveMutation.isPending,
    sendFriendRequestError: sendFriendRequestMutation.error?.message ?? null,
  };
});

export function useDecisionComments(decisionId: string) {
  const { getCommentsForDecision } = useSocial();
  return useMemo(
    () => getCommentsForDecision(decisionId),
    [getCommentsForDecision, decisionId]
  );
}

export function useFriendActivity() {
  const { activities, acceptedFriends } = useSocial();
  const { user } = useAuth();
  return useMemo(() => {
    const friendIds = new Set(
      acceptedFriends.map((f) =>
        f.requesterId === user?.id ? f.recipientId : f.requesterId
      )
    );
    return activities.filter(
      (a) => friendIds.has(a.userId) || a.userId === user?.id
    );
  }, [activities, acceptedFriends, user?.id]);
}

/** Debates the current user saved, in save order (newest first). */
export function useSavedDecisions(): Decision[] {
  const { savedEntries } = useSocial();
  const { decisions } = useDecisions();
  return useMemo(() => {
    const byId = new Map(decisions.map((d) => [d.id, d]));
    return savedEntries
      .map((s) => byId.get(s.decisionId))
      .filter((d): d is Decision => d !== undefined);
  }, [savedEntries, decisions]);
}

/** Debates created by the current user's accepted friends, newest first. */
export function useFriendDebates(): Decision[] {
  const { friendIds } = useSocial();
  const { decisions } = useDecisions();
  return useMemo(() => {
    const ids = new Set(friendIds);
    return decisions
      .filter((d) => ids.has(d.createdBy))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [friendIds, decisions]);
}
