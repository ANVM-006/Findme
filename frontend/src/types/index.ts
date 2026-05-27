export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number | null;
  career: string | null;
  semester: number | null;
  bio: string | null;
  profile_photo: string | null;
  photos: { id: string; photo_url: string; order_index: number }[];
  interests: string[];
  is_online: number;
  last_seen: string | null;
  compatibility_score?: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  msg_type: string;
  is_read: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  other_user: UserProfile;
  last_message: Message | null;
  unread_count: number;
  last_message_at: string | null;
}
