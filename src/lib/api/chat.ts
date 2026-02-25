// Chat API service based on OpenAPI spec - volantis-chat endpoints
import { apiClient } from './client';
import type { VolChatMessageOut, VolChatMessageCreate, VolChatMessageEdit } from '@/types/chat';

export const chatApi = {
  /**
   * Get livestream chat messages with pagination
   * Returns newest messages first
   */
  async getMessages(
    slug: string,
    page: number = 1,
    size: number = 50
  ): Promise<VolChatMessageOut[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    return apiClient.request<VolChatMessageOut[]>(
      `/livestream-chat/${slug}/messages?${params}`,
      { method: 'GET' }
    );
  },

  /**
   * Send a chat message to the livestream
   * Requires authentication
   */
  async sendMessage(
    slug: string,
    content: string
  ): Promise<VolChatMessageOut> {
    const body: VolChatMessageCreate = { content };
    
    return apiClient.request<VolChatMessageOut>(
      `/livestream-chat/${slug}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },

  /**
   * Edit a chat message
   * Only the message author can edit
   */
  async editMessage(
    messageId: number,
    content: string
  ): Promise<VolChatMessageOut> {
    const body: VolChatMessageEdit = { content };
    
    return apiClient.request<VolChatMessageOut>(
      `/livestream-chat/messages/${messageId}/edit`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    );
  },

  /**
   * Delete a chat message (soft delete)
   * Only the message author or an admin can delete
   */
  async deleteMessage(messageId: number): Promise<void> {
    return apiClient.request<void>(
      `/livestream-chat/messages/${messageId}`,
      { method: 'DELETE' }
    );
  },
};

export default chatApi;