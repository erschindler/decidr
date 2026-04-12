export type Category =
  | "food"
  | "lifestyle"
  | "tech"
  | "politics"
  | "entertainment"
  | "sports"
  | "relationships"
  | "finance"
  | "health"
  | "random";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "lifestyle", label: "Lifestyle", emoji: "✨" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "politics", label: "Politics", emoji: "🏛️" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "relationships", label: "Relationships", emoji: "💬" },
  { id: "finance", label: "Finance", emoji: "💰" },
  { id: "health", label: "Health", emoji: "🏃" },
  { id: "random", label: "Random", emoji: "🎲" },
];

export type DecisionStatus =
  | "open_topic"
  | "open_one_side"
  | "ready"
  | "active";

export type SubmissionMode =
  | "full"
  | "topic_only"
  | "topic_and_side";

export interface Side {
  title: string;
  argument: string;
}

export interface Justification {
  id: string;
  userId: string;
  userName: string;
  side: "a" | "b";
  text: string;
  createdAt: string;
}

export interface AIJudgment {
  vote: "a" | "b";
  reasoning: string;
  keyPoints: string[];
  confidence: number;
}

export interface Decision {
  id: string;
  title: string;
  category: Category;
  sideA: Side | null;
  sideB: Side | null;
  votesA: number;
  votesB: number;
  totalVotes: number;
  createdBy: string;
  createdAt: string;
  justifications: Justification[];
  aiJudgment: AIJudgment | null;
  aiPending: boolean;
  status: DecisionStatus;
  submissionMode: SubmissionMode;
  sideAContributor?: string;
  sideBContributor?: string;
}

export interface UserVote {
  decisionId: string;
  side: "a" | "b";
  justification?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  decisionsCreated: number;
  votesCast: number;
  aiAlignmentRate: number;
}
