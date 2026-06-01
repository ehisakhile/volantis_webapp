// Meetings API Service
import { apiClient } from './client';
import type {
  VolMeetingOut,
  VolMeetingPlaybackOut,
  VolMeetingParticipantOut,
  StartInstantMeetingRequest,
  ScheduleMeetingRequest,
  MeetingListResponse,
  ActiveMeetingsResponse,
} from '@/types/meeting';

export const meetingsApi = {
  async createInstantMeeting(
    data: StartInstantMeetingRequest
  ): Promise<VolMeetingOut> {
    if (data.thumbnail) {
      const formData = new FormData();
      formData.append('title', data.title);
      if (data.description) {
        formData.append('description', data.description);
      }
      if (data.stream_type) {
        formData.append('stream_type', data.stream_type);
      }
      if (data.max_participants) {
        formData.append('max_participants', data.max_participants.toString());
      }
      formData.append('thumbnail', data.thumbnail);

      const response = await apiClient.requestFormData<VolMeetingOut>(
        '/meetings/instant',
        formData
      );
      return response;
    }

    const formData = new URLSearchParams();
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.stream_type) {
      formData.append('stream_type', data.stream_type);
    }
    if (data.max_participants) {
      formData.append('max_participants', data.max_participants.toString());
    }

    const response = await apiClient.request<VolMeetingOut>(
      '/meetings/instant',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );
    return response;
  },

  async scheduleMeeting(
    data: ScheduleMeetingRequest
  ): Promise<VolMeetingOut> {
    const formData = new URLSearchParams();
    formData.append('title', data.title);
    formData.append('scheduled_start_time', data.scheduled_start_time);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.stream_type) {
      formData.append('stream_type', data.stream_type);
    }
    if (data.max_participants) {
      formData.append('max_participants', data.max_participants.toString());
    }
    if (data.scheduled_end_time) {
      formData.append('scheduled_end_time', data.scheduled_end_time);
    }

    const response = await apiClient.request<VolMeetingOut>(
      '/meetings/schedule',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );
    return response;
  },

  async startScheduledMeeting(meetingId: number): Promise<VolMeetingOut> {
    const response = await apiClient.request<VolMeetingOut>(
      `/meetings/${meetingId}/start`,
      { method: 'POST' }
    );
    return response;
  },

  async joinMeeting(
    meetingId: number | string,
    role: 'host' | 'co_host' | 'participant' = 'participant'
  ): Promise<VolMeetingOut> {
    const formData = new URLSearchParams();
    formData.append('role', role);

    const response = await apiClient.request<VolMeetingOut>(
      `/meetings/${meetingId}/join`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );
    return response;
  },

  async leaveMeeting(meetingId: number | string): Promise<void> {
    await apiClient.request(`/meetings/${meetingId}/leave`, {
      method: 'POST',
    });
  },

  async endMeeting(meetingId: number): Promise<VolMeetingOut> {
    const response = await apiClient.request<VolMeetingOut>(
      `/meetings/${meetingId}/end`,
      { method: 'POST' }
    );
    return response;
  },

  async getPlayback(meetingId: number): Promise<VolMeetingPlaybackOut> {
    const response = await apiClient.request<VolMeetingPlaybackOut>(
      `/meetings/${meetingId}/playback`,
      { method: 'GET' }
    );
    return response;
  },

  async getParticipants(meetingId: number): Promise<VolMeetingParticipantOut[]> {
    const response = await apiClient.request<VolMeetingParticipantOut[]>(
      `/meetings/${meetingId}/participants`,
      { method: 'GET' }
    );
    return response;
  },

  async getMyMeetings(params?: {
    status?: string;
    meeting_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<MeetingListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.meeting_type) searchParams.append('meeting_type', params.meeting_type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const endpoint = `/meetings${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.request<MeetingListResponse>(endpoint, {
      method: 'GET',
    });
    return response;
  },

  async getActiveMeetings(
    limit: number = 50,
    offset: number = 0
  ): Promise<ActiveMeetingsResponse> {
    const response = await apiClient.request<ActiveMeetingsResponse>(
      `/meetings/active?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  async getMeeting(meetingId: number | string): Promise<VolMeetingOut> {
    const response = await apiClient.request<VolMeetingOut>(
      `/meetings/${meetingId}`,
      { method: 'GET' }
    );
    return response;
  },

  async updateMeeting(
    meetingId: number | string,
    data: Partial<{
      title: string;
      description: string;
      scheduled_start_time: string;
      scheduled_end_time: string;
      max_participants: number;
    }>
  ): Promise<VolMeetingOut> {
    const formData = new URLSearchParams();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.scheduled_start_time) {
      formData.append('scheduled_start_time', data.scheduled_start_time);
    }
    if (data.scheduled_end_time) {
      formData.append('scheduled_end_time', data.scheduled_end_time);
    }
    if (data.max_participants) {
      formData.append('max_participants', data.max_participants.toString());
    }

    const response = await apiClient.request<VolMeetingOut>(
      `/meetings/${meetingId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );
    return response;
  },

  async cancelMeeting(meetingId: number): Promise<void> {
    await apiClient.request(`/meetings/${meetingId}`, { method: 'DELETE' });
  },
};

export default meetingsApi;