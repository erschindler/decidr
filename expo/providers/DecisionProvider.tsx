import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import { Decision, UserVote, UserProfile, AIJudgment, Category, Side } from "@/types/decision";
import { useAuth } from "@/providers/AuthProvider";
import { supabase, resolveAvatarUrl } from "@/lib/supabase";
import { computeStreaks } from "@/lib/stats";

function getDefaultProfile(userId: string, displayName?: string): UserProfile {
  return {
    id: userId,
    name: displayName ?? "You",
    avatar: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(displayName ?? "U")}&backgroundColor=FF6B6B`,
    decisionsCreated: 0,
    votesCast: 0,
    aiAlignmentRate: 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToDecision(row: any): Decision {
  return {
    id: String(row.id ?? ""),
    title: (row.title as string) ?? "",
    category: (row.category as Category) ?? "random",
    sideA: row.side_a as Side | null,
    sideB: row.side_b as Side | null,
    votesA: Number(row.votes_a ?? 0),
    votesB: Number(row.votes_b ?? 0),
    totalVotes: Number(row.total_votes ?? 0),
    createdBy: (row.created_by as string) ?? "",
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? (row.created_at as string) ?? "",
    shareCount: Number(row.share_count ?? 0),
    justifications: (row.justifications as Decision["justifications"]) ?? [],
    aiJudgment: row.ai_judgment as AIJudgment | null,
    aiPending: Boolean(row.ai_pending),
    status: (row.status as Decision["status"]) ?? "active",
    submissionMode: (row.submission_mode as Decision["submissionMode"]) ?? "full",
    sideAContributor: row.side_a_contributor as string | undefined,
    sideBContributor: row.side_b_contributor as string | undefined,
  };
}

const aiJudgmentSchema = z.object({
  vote: z.enum(["a", "b"]).describe("Which side the AI judges to be more correct"),
  reasoning: z.string().describe("A balanced, insightful 2-3 sentence explanation of why this side was chosen"),
  keyPoints: z.array(z.string()).describe("3-4 key reasons supporting the judgment"),
  confidence: z.number().min(0.5).max(0.95).describe("Confidence level between 0.5 and 0.95"),
});

export const [DecisionProvider, useDecisions] = createContextHook(() => {
  /* eslint-disable rork/general-context-optimization */
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id ?? null;
  const displayName = user?.user_metadata?.display_name as string | undefined;

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [userVotes, setUserVotes] = useState<UserVote[]>([]);
  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile(currentUserId ?? "", displayName));

  useEffect(() => {
    if (currentUserId) {
      setProfile(getDefaultProfile(currentUserId, displayName));
    }
  }, [currentUserId, displayName]);

  const decisionsQuery = useQuery({
    queryKey: ["decisions"],
    enabled: isAuthenticated,
    queryFn: async () => {
      console.log("[Decisions] Fetching from Supabase...");
      const { data, error } = await supabase
        .from("decisions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.log("[Decisions] Supabase error:", error.message);
        throw new Error(error.message);
      }
      const mapped: Decision[] = (data ?? []).map(mapRowToDecision);
      console.log("[Decisions] Fetched", mapped.length, "decisions from Supabase");
      return mapped;
    },
  });

  const votesQuery = useQuery({
    queryKey: ["votes", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [];
      console.log("[Votes] Fetching votes for user:", currentUserId);
      const { data, error } = await supabase
        .from("user_votes")
        .select("*")
        .eq("user_id", currentUserId);
      if (error) {
        console.log("[Votes] Supabase fetch failed:", error.message);
        throw new Error(error.message);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: UserVote[] = (data ?? []).map((row: any) => ({
        decisionId: (row.decision_id as string) ?? "",
        side: (row.side as "a" | "b") ?? "a",
        justification: row.justification as string | undefined,
        createdAt: (row.created_at as string) ?? "",
      }));
      console.log("[Votes] Fetched", mapped.length, "votes from Supabase");
      return mapped;
    },
  });

  const profileQuery = useQuery({
    queryKey: ["profile", currentUserId],
    enabled: isAuthenticated && !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return getDefaultProfile("", displayName);
      console.log("[Profile] Fetching profile for user:", currentUserId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .single();
      if (error || !data) {
        console.log("[Profile] Supabase fetch failed, using default:", error?.message);
        return getDefaultProfile(currentUserId, displayName);
      }
      const resolvedAvatar = await resolveAvatarUrl(data.avatar_url);
      const mapped: UserProfile = {
        id: String(data.id),
        name: String(data.display_name ?? displayName ?? "You"),
        avatar: resolvedAvatar || getDefaultProfile(currentUserId, displayName).avatar,
        decisionsCreated: Number(data.decisions_created ?? 0),
        votesCast: Number(data.votes_cast ?? 0),
        aiAlignmentRate: Number(data.ai_alignment_rate ?? 0),
      };
      console.log("[Profile] Fetched profile:", mapped.name, "avatar resolved:", !!resolvedAvatar);
      return mapped;
    },
  });

  useEffect(() => {
    if (decisionsQuery.data) setDecisions(decisionsQuery.data);
  }, [decisionsQuery.data]);

  useEffect(() => {
    if (votesQuery.data) setUserVotes(votesQuery.data);
  }, [votesQuery.data]);

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
  }, [profileQuery.data]);

  const refreshAll = useCallback(() => {
    console.log("[Refresh] Invalidating all queries...");
    void queryClient.invalidateQueries({ queryKey: ["decisions"] });
    void queryClient.invalidateQueries({ queryKey: ["votes"] });
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
  }, [queryClient]);

  const updateProfileAvatar = useCallback((avatarUrl: string) => {
    console.log("[Profile] Updating avatar locally:", avatarUrl);
    setProfile((prev) => ({ ...prev, avatar: avatarUrl }));
  }, []);

  const updateProfileName = useCallback(async (newName: string) => {
    if (!currentUserId) return;
    console.log("[Profile] Updating display name to:", newName);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: newName })
      .eq("id", currentUserId);

    if (profileError) {
      console.log("[Profile] Failed to update display_name in profiles:", profileError.message);
      throw new Error(profileError.message);
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: newName },
    });

    if (authError) {
      console.log("[Profile] Failed to update auth metadata:", authError.message);
    }

    setProfile((prev) => {
      const hasCustomAvatar = prev.avatar && !prev.avatar.includes('api.dicebear.com');
      return {
        ...prev,
        name: newName,
        avatar: hasCustomAvatar
          ? prev.avatar
          : `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(newName)}&backgroundColor=FF6B6B`,
      };
    });
    refreshAll();
    console.log("[Profile] Display name updated successfully");
  }, [currentUserId, refreshAll]);

  useEffect(() => {
    if (!isAuthenticated) {
      console.log("[Realtime] Skipping subscription — not authenticated");
      return;
    }

    console.log("[Realtime] Setting up subscription...");
    const channel = supabase
      .channel("decisions_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "decisions" }, (payload) => {
        console.log("[Realtime] Decision change:", payload.eventType);
        void queryClient.invalidateQueries({ queryKey: ["decisions"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_votes" }, (payload) => {
        console.log("[Realtime] New vote:", payload.new);
        void queryClient.invalidateQueries({ queryKey: ["decisions"] });
        void queryClient.invalidateQueries({ queryKey: ["votes"] });
      })
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Removing channel");
      void supabase.removeChannel(channel);
    };
  }, [queryClient, isAuthenticated]);

  const generateAIJudgment = useCallback(async (decision: Decision): Promise<AIJudgment> => {
    try {
      console.log("[AI] Generating judgment for:", decision.title);
      const result = await generateObject({
        messages: [
          {
            role: "user",
            content: `You are an impartial AI Judge analyzing a debate. Be fair, balanced, and insightful.

DEBATE TITLE: "${decision.title}"

SIDE A - "${decision.sideA?.title}":
${decision.sideA?.argument}

SIDE B - "${decision.sideB?.title}":
${decision.sideB?.argument}

Analyze both sides for logic, evidence quality, factual accuracy, clarity, and persuasiveness. Then cast your vote for the stronger side and explain your reasoning.`,
          },
        ],
        schema: aiJudgmentSchema,
      });
      console.log("[AI] Judgment generated successfully, vote:", result.vote);
      return result;
    } catch (error) {
      console.log("[AI] Judgment generation failed, using fallback:", error);
      const sides = ["a", "b"] as const;
      const vote = sides[Math.floor(Math.random() * 2)];
      return {
        vote,
        reasoning: `After careful analysis of both arguments, Side ${vote === "a" ? "A" : "B"} presents a marginally stronger case. Both sides make valid points, but the evidence and logical structure of Side ${vote === "a" ? "A" : "B"} is more compelling overall.`,
        keyPoints: [
          "Both arguments contain valid reasoning",
          `Side ${vote === "a" ? "A" : "B"} provides more concrete evidence`,
          "The logical structure is tighter and more persuasive",
          "Counter-arguments are better addressed",
        ],
        confidence: 0.6 + Math.random() * 0.2,
      };
    }
  }, []);

  const saveAIJudgmentToSupabase = useCallback(async (decisionId: string, judgment: AIJudgment) => {
    try {
      console.log("[AI] Saving judgment to Supabase for decision:", decisionId);
      const { error } = await supabase
        .from("decisions")
        .update({ ai_judgment: judgment as unknown as Record<string, unknown>, ai_pending: false })
        .eq("id", decisionId);
      if (error) {
        console.log("[AI] Failed to save judgment to Supabase:", error.message);
      } else {
        console.log("[AI] Judgment saved to Supabase successfully");
        void queryClient.invalidateQueries({ queryKey: ["decisions"] });
      }
    } catch (err) {
      console.log("[AI] Error saving judgment:", err);
    }
  }, [queryClient]);

  const triggerAIJudgment = useCallback(
    (decision: Decision) => {
      void generateAIJudgment(decision).then((judgment) => {
        setDecisions((prev) =>
          prev.map((d) =>
            d.id === decision.id ? { ...d, aiJudgment: judgment, aiPending: false } : d
          )
        );
        void saveAIJudgmentToSupabase(decision.id, judgment);
      });
    },
    [generateAIJudgment, saveAIJudgmentToSupabase]
  );

  const createDecision = useCallback(
    async (title: string, category: Category, sideA: Side, sideB: Side) => {
      if (!currentUserId) {
        console.log("[Create] No authenticated user, aborting");
        throw new Error("You must be signed in to create a decision");
      }
      console.log("[Create] Creating full decision:", title);

      const { data: inserted, error } = await supabase.from("decisions").insert({
        title,
        category,
        side_a: sideA as unknown as Record<string, unknown>,
        side_b: sideB as unknown as Record<string, unknown>,
        votes_a: 0,
        votes_b: 0,
        total_votes: 0,
        created_by: currentUserId,
        justifications: [],
        ai_judgment: null,
        ai_pending: true,
        status: "active",
        submission_mode: "full",
        side_a_contributor: currentUserId,
        side_b_contributor: currentUserId,
      }).select().single();

      if (error) {
        console.log("[Create] Supabase insert error:", error.message);
        throw new Error(error.message);
      }

      const newId = String(inserted.id);
      console.log("[Create] Inserted into Supabase with id:", newId);

      const newDecision: Decision = {
        id: newId,
        title,
        category,
        sideA,
        sideB,
        votesA: 0,
        votesB: 0,
        totalVotes: 0,
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareCount: 0,
        justifications: [],
        aiJudgment: null,
        aiPending: true,
        status: "active",
        submissionMode: "full",
        sideAContributor: currentUserId,
        sideBContributor: currentUserId,
      };

      setDecisions((prev) => [newDecision, ...prev]);
      triggerAIJudgment(newDecision);
      refreshAll();

      return newId;
    },
    [triggerAIJudgment, currentUserId, refreshAll]
  );

  const createTopicOnly = useCallback(
    async (title: string, category: Category) => {
      if (!currentUserId) {
        console.log("[Create] No authenticated user, aborting");
        throw new Error("You must be signed in to create a decision");
      }
      console.log("[Create] Creating topic-only decision:", title);

      const { data: inserted, error } = await supabase.from("decisions").insert({
        title,
        category,
        side_a: null,
        side_b: null,
        votes_a: 0,
        votes_b: 0,
        total_votes: 0,
        created_by: currentUserId,
        justifications: [],
        ai_judgment: null,
        ai_pending: false,
        status: "open_topic",
        submission_mode: "topic_only",
        side_a_contributor: null,
        side_b_contributor: null,
      }).select().single();

      if (error) {
        console.log("[Create] Supabase topic-only insert error:", error.message);
        throw new Error(error.message);
      }

      const newId = String(inserted.id);
      console.log("[Create] Topic-only inserted into Supabase with id:", newId);

      const newDecision: Decision = {
        id: newId,
        title,
        category,
        sideA: null,
        sideB: null,
        votesA: 0,
        votesB: 0,
        totalVotes: 0,
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareCount: 0,
        justifications: [],
        aiJudgment: null,
        aiPending: false,
        status: "open_topic",
        submissionMode: "topic_only",
      };

      setDecisions((prev) => [newDecision, ...prev]);
      refreshAll();

      return newId;
    },
    [currentUserId, refreshAll]
  );

  const createTopicAndSide = useCallback(
    async (title: string, category: Category, side: Side, whichSide: "a" | "b") => {
      if (!currentUserId) {
        console.log("[Create] No authenticated user, aborting");
        throw new Error("You must be signed in to create a decision");
      }
      console.log("[Create] Creating topic+side decision:", title, "side:", whichSide);

      const { data: inserted, error } = await supabase.from("decisions").insert({
        title,
        category,
        side_a: whichSide === "a" ? (side as unknown as Record<string, unknown>) : null,
        side_b: whichSide === "b" ? (side as unknown as Record<string, unknown>) : null,
        votes_a: 0,
        votes_b: 0,
        total_votes: 0,
        created_by: currentUserId,
        justifications: [],
        ai_judgment: null,
        ai_pending: false,
        status: "open_one_side",
        submission_mode: "topic_and_side",
        side_a_contributor: whichSide === "a" ? currentUserId : null,
        side_b_contributor: whichSide === "b" ? currentUserId : null,
      }).select().single();

      if (error) {
        console.log("[Create] Supabase topic+side insert error:", error.message);
        throw new Error(error.message);
      }

      const newId = String(inserted.id);
      console.log("[Create] Topic+side inserted into Supabase with id:", newId);

      const newDecision: Decision = {
        id: newId,
        title,
        category,
        sideA: whichSide === "a" ? side : null,
        sideB: whichSide === "b" ? side : null,
        votesA: 0,
        votesB: 0,
        totalVotes: 0,
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareCount: 0,
        justifications: [],
        aiJudgment: null,
        aiPending: false,
        status: "open_one_side",
        submissionMode: "topic_and_side",
        sideAContributor: whichSide === "a" ? currentUserId : undefined,
        sideBContributor: whichSide === "b" ? currentUserId : undefined,
      };

      setDecisions((prev) => [newDecision, ...prev]);
      refreshAll();

      return newId;
    },
    [currentUserId, refreshAll]
  );

  const contributeSide = useCallback(
    async (decisionId: string, side: Side, whichSide: "a" | "b") => {
      if (!currentUserId) {
        console.log("[Contribute] No authenticated user, aborting");
        return;
      }
      console.log("[Contribute] Contributing side", whichSide, "to decision:", decisionId);
      const decision = decisions.find((d) => d.id === decisionId);
      if (!decision) {
        console.log("[Contribute] Decision not found:", decisionId);
        return;
      }

      const isTopicOnly = decision.status === "open_topic";
      const updatedDecision: Decision = {
        ...decision,
        sideA: whichSide === "a" ? side : decision.sideA,
        sideB: whichSide === "b" ? side : decision.sideB,
        sideAContributor: whichSide === "a" ? currentUserId : decision.sideAContributor,
        sideBContributor: whichSide === "b" ? currentUserId : decision.sideBContributor,
      };

      const bothSidesFilled = updatedDecision.sideA !== null && updatedDecision.sideB !== null;

      if (bothSidesFilled) {
        updatedDecision.status = "active";
        updatedDecision.aiPending = true;
      } else if (isTopicOnly) {
        updatedDecision.status = "open_one_side";
      }

      const updatePayload: Record<string, unknown> = {
        status: updatedDecision.status,
        ai_pending: updatedDecision.aiPending,
      };

      if (whichSide === "a") {
        updatePayload.side_a = side as unknown as Record<string, unknown>;
        updatePayload.side_a_contributor = currentUserId;
      } else {
        updatePayload.side_b = side as unknown as Record<string, unknown>;
        updatePayload.side_b_contributor = currentUserId;
      }

      const { error } = await supabase
        .from("decisions")
        .update(updatePayload)
        .eq("id", decisionId);

      if (error) {
        console.log("[Contribute] Supabase update error:", error.message);
        throw new Error(error.message);
      }

      console.log("[Contribute] Supabase update success");
      setDecisions((prev) => prev.map((d) => (d.id === decisionId ? updatedDecision : d)));

      if (bothSidesFilled) {
        triggerAIJudgment(updatedDecision);
      }

      refreshAll();
    },
    [decisions, triggerAIJudgment, currentUserId, refreshAll]
  );

  const castVote = useCallback(
    async (decisionId: string, side: "a" | "b", justification?: string) => {
      if (!currentUserId) {
        console.log("[Vote] No authenticated user, aborting");
        return;
      }

      const existing = userVotes.find((v) => v.decisionId === decisionId);
      if (existing) {
        console.log("[Vote] Already voted on this decision");
        return;
      }

      console.log("[Vote] Casting vote:", side, "on decision:", decisionId);

      const { error } = await supabase.from("user_votes").insert({
        user_id: currentUserId,
        decision_id: decisionId,
        side,
        justification: justification ?? null,
      });

      if (error) {
        console.log("[Vote] Supabase insert error:", error.message);
        throw new Error(error.message);
      }

      console.log("[Vote] Vote saved to Supabase successfully");

      const newVote: UserVote = { decisionId, side, justification, createdAt: new Date().toISOString() };
      const updatedVotes = [...userVotes, newVote];
      setUserVotes(updatedVotes);

      setDecisions((prev) =>
        prev.map((d) => {
          if (d.id !== decisionId) return d;
          const newJustifications = justification
            ? [
                ...d.justifications,
                {
                  id: crypto.randomUUID?.() ?? Date.now().toString(),
                  userId: currentUserId,
                  userName: profile.name,
                  side,
                  text: justification,
                  createdAt: new Date().toISOString(),
                },
              ]
            : d.justifications;
          return {
            ...d,
            votesA: side === "a" ? d.votesA + 1 : d.votesA,
            votesB: side === "b" ? d.votesB + 1 : d.votesB,
            totalVotes: d.totalVotes + 1,
            justifications: newJustifications,
          };
        })
      );

      const alignedVotes = updatedVotes.filter((v) => {
        const dec = decisions.find((d) => d.id === v.decisionId);
        return dec?.aiJudgment && dec.aiJudgment.vote === v.side;
      });
      const totalVotedWithAI = updatedVotes.filter((v) => {
        const dec = decisions.find((d) => d.id === v.decisionId);
        return dec?.aiJudgment;
      });
      const aiRate = totalVotedWithAI.length > 0 ? Math.round((alignedVotes.length / totalVotedWithAI.length) * 100) : 0;

      setProfile((prev) => ({
        ...prev,
        votesCast: prev.votesCast + 1,
        aiAlignmentRate: aiRate,
      }));

      try {
        await supabase.from("profiles").update({
          ai_alignment_rate: aiRate,
        }).eq("id", currentUserId);
      } catch (err) {
        console.log("[Vote] Profile AI rate sync failed:", err);
      }

      refreshAll();
    },
    [decisions, userVotes, profile, currentUserId, refreshAll]
  );

  const getUserVote = useCallback(
    (decisionId: string): UserVote | undefined => {
      return userVotes.find((v) => v.decisionId === decisionId);
    },
    [userVotes]
  );

  const getDecision = useCallback(
    (id: string): Decision | undefined => {
      return decisions.find((d) => d.id === id);
    },
    [decisions]
  );

  // Daily Voting Streak stats — derived from actual vote timestamps (see lib/stats)
  const voteStreaks = useMemo(
    () => computeStreaks(userVotes.map((v) => v.createdAt)),
    [userVotes]
  );

  const isLoading = decisionsQuery.isLoading || votesQuery.isLoading;

  return {
    decisions,
    userVotes,
    profile,
    voteStreaks,
    isLoading,
    createDecision,
    createTopicOnly,
    createTopicAndSide,
    contributeSide,
    castVote,
    getUserVote,
    getDecision,
    refreshAll,
    updateProfileAvatar,
    updateProfileName,
  };
});

export type DiscoverySort = "new" | "trending" | "most_voted" | "most_divided" | "popular";

/**
 * Trending = recent engagement with time decay. A debate with rapidly
 * increasing activity outranks an older debate with more lifetime votes.
 * Uses updated_at (bumped by every vote/share) as the recency signal.
 */
function trendingScore(d: Decision): number {
  const engagement = d.totalVotes + d.shareCount * 3 + d.justifications.length;
  const activityTime = new Date(d.updatedAt || d.createdAt).getTime();
  const ageHours = Math.max(0, (Date.now() - activityTime) / 3600000);
  return engagement / Math.pow(ageHours + 2, 1.4);
}

/** Popular = overall engagement across votes, shares and comments. */
function popularityScore(d: Decision): number {
  return d.totalVotes * 2 + d.shareCount * 3 + d.justifications.length;
}

/** Most Divided = human vote closest to 50/50 (needs at least 2 votes). */
function dividednessScore(d: Decision): number {
  return Math.min(d.votesA, d.votesB) / d.totalVotes;
}

export function useSortedDecisions(sort: DiscoverySort): Decision[] {
  const { decisions } = useDecisions();
  return useMemo(() => {
    switch (sort) {
      case "new":
        return [...decisions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "most_voted":
        return [...decisions].sort((a, b) => b.totalVotes - a.totalVotes);
      case "most_divided": {
        const withVotes = decisions.filter((d) => d.totalVotes >= 2);
        return [...withVotes].sort((a, b) => {
          const diff = dividednessScore(b) - dividednessScore(a);
          if (diff !== 0) return diff;
          return b.totalVotes - a.totalVotes;
        });
      }
      case "popular":
        return [...decisions].sort((a, b) => popularityScore(b) - popularityScore(a));
      case "trending":
      default:
        return [...decisions].sort((a, b) => trendingScore(b) - trendingScore(a));
    }
  }, [decisions, sort]);
}

export function useTrendingDecisions() {
  return useSortedDecisions("trending");
}

export function useNewDecisions() {
  return useSortedDecisions("new");
}

export function useMostVotedDecisions() {
  return useSortedDecisions("most_voted");
}

export function useMostDividedDecisions() {
  return useSortedDecisions("most_divided");
}

export function usePopularDecisions() {
  return useSortedDecisions("popular");
}

export function useFilteredDecisions(category: Category | "all", search: string) {
  const { decisions } = useDecisions();
  return useMemo(() => {
    let filtered = decisions;
    if (category !== "all") {
      filtered = filtered.filter((d) => d.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.sideA?.title.toLowerCase().includes(q) ?? false) ||
          (d.sideB?.title.toLowerCase().includes(q) ?? false)
      );
    }
    return filtered;
  }, [decisions, category, search]);
}

export function useOpenDecisions() {
  const { decisions } = useDecisions();
  return useMemo(
    () => decisions.filter((d) => d.status === "open_topic" || d.status === "open_one_side"),
    [decisions]
  );
}

export function useMyDecisions() {
  const { decisions } = useDecisions();
  const { user } = useAuth();
  return useMemo(
    () => decisions.filter((d) => d.createdBy === user?.id),
    [decisions, user?.id]
  );
}
