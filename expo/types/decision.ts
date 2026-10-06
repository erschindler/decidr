export type Category =
  | "food"
  | "lifestyle"
  | "tech"
  | "politics"
  | "entertainment"
  | "sports"
  | "relationships"
  | "health"
  | "finance"
  | "random"
  | "gaming"
  | "science"
  | "education"
  | "work_career"
  | "travel"
  | "cars_transport"
  | "music"
  | "movies_tv"
  | "history"
  | "law_justice"
  | "religion_philosophy"
  | "pets_animals";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "lifestyle", label: "Lifestyle", emoji: "✨" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "politics", label: "Politics", emoji: "🏛️" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "relationships", label: "Relationships", emoji: "💬" },
  { id: "health", label: "Health", emoji: "🏃" },
  { id: "finance", label: "Finance", emoji: "💰" },
  { id: "random", label: "Random", emoji: "🎲" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "work_career", label: "Work & Career", emoji: "💼" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "cars_transport", label: "Cars & Transportation", emoji: "🚗" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "movies_tv", label: "Movies & TV", emoji: "📺" },
  { id: "history", label: "History", emoji: "📜" },
  { id: "law_justice", label: "Law & Justice", emoji: "⚖️" },
  { id: "religion_philosophy", label: "Religion & Philosophy", emoji: "🕊️" },
  { id: "pets_animals", label: "Pets & Animals", emoji: "🐾" },
];

export function getCategoryInfo(category: string): { id: Category; label: string; emoji: string } {
  return CATEGORIES.find((c) => c.id === category) ?? CATEGORIES.find((c) => c.id === "random")!;
}

export type DecisionStatus =
  | "open_topic"
  | "open_one_side"
  | "ready"
  | "active";

export type SubmissionMode =
  | "full"
  | "topic_only"
  | "topic_and_side";

export type ShareMethod =
  | "native"
  | "copy"
  | "x"
  | "facebook"
  | "reddit"
  | "email"
  | "other";

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
  updatedAt: string;
  shareCount: number;
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
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  decisionsCreated: number;
  votesCast: number;
  aiAlignmentRate: number;
}

export interface VoteStreaks {
  current: number;
  longest: number;
}

export interface AppNotification {
  id: string;
  type: "friend_request" | "friend_accepted" | "share" | "vote_milestone";
  title: string;
  body: string | null;
  actorId: string | null;
  decisionId: string | null;
  isRead: boolean;
  createdAt: string;
}
