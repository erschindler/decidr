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
  return (
    CATEGORIES.find((c) => c.id === category) ?? CATEGORIES.find((c) => c.id === "random")!
  );
}

export function formatVotes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(1, Math.floor(diff / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
