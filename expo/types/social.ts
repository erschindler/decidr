export interface DecisionLike {
  id: string;
  userId: string;
  decisionId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  decisionId: string;
  text: string;
  createdAt: string;
  parentId: string | null;
  likesCount: number;
}

export interface CommentLike {
  id: string;
  userId: string;
  commentId: string;
}

export type FriendshipStatus = "pending" | "accepted" | "rejected";

export interface Friendship {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  status: FriendshipStatus;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: "like" | "comment" | "friend_request" | "friend_accepted" | "vote";
  userId: string;
  userName: string;
  userAvatar: string;
  decisionId?: string;
  decisionTitle?: string;
  commentText?: string;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatar: string;
  decisionsCreated: number;
  votesCast: number;
  aiAlignmentRate: number;
  isFriend: boolean;
  friendshipStatus: FriendshipStatus | null;
  friendshipId: string | null;
}
