// Chat message types based on OpenAPI spec

export interface VolChatMessageOut {
  id: number;
  livestream_slug: string;
  username: string;
  content: string;
  is_deleted: boolean;
  is_edited: boolean
  is_creator: boolean;
  created_at: string;
  updated_at?: string;
}

export interface VolChatMessageCreate {
  content: string;
}

export interface VolChatMessageEdit {
  content: string;
}
