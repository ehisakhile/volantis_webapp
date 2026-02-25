// Chat message types based on OpenAPI spec

export interface VolChatMessageOut {
  id: number;
  livestream_id: number;
  user_id: number;
  user_username: string;
  user_avatar_url?: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
}

export interface VolChatMessageCreate {
  content: string;
}

export interface VolChatMessageEdit {
  content: string;
}