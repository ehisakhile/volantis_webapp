"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Video,
  Radio,
  Users,
  Settings,
  Loader2,
  X,
  Upload,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { meetingsApi } from "@/lib/api/meetings";
import { useAuth } from "@/lib/auth-context";
import type { StreamTypeInput } from "@/types/meeting";

export default function CreateMeetingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [streamType, setStreamType] = useState<StreamTypeInput>("audio_only");
  const [maxParticipants, setMaxParticipants] = useState(25);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle thumbnail selection
  const handleThumbnailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setThumbnail(file);
        setThumbnailPreview(URL.createObjectURL(file));
      }
    },
    []
  );

  // Remove thumbnail
  const removeThumbnail = useCallback(() => {
    setThumbnail(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  }, [thumbnailPreview]);

  // Create instant meeting
  const handleCreateMeeting = useCallback(async () => {
    if (!meetingTitle.trim()) {
      setError("Please enter a meeting title");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const meeting = await meetingsApi.createInstantMeeting({
        title: meetingTitle.trim(),
        description: meetingDescription.trim() || undefined,
        stream_type: streamType,
        max_participants: maxParticipants,
        thumbnail: thumbnail || undefined,
      });

      const meetingUrl = `/meeting/${meeting.nice_id || meeting.id}`;
      router.push(meetingUrl);
    } catch (err) {
      console.error("Failed to create meeting:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create meeting. Please try again."
      );
      setIsCreating(false);
    }
  }, [
    meetingTitle,
    meetingDescription,
    streamType,
    maxParticipants,
    thumbnail,
    router,
  ]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-sky-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Start a Meeting</h1>
            <p className="text-slate-400">
              Create an instant meeting and invite participants
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Meeting Settings */}
          <div className="space-y-6">
            {/* Meeting Info */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-500" />
                Meeting Details
              </h2>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  placeholder="What's this meeting about?"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Cover Image (optional)
                </label>
                {thumbnailPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-32 h-32 object-cover rounded-lg border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-sky-500 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs text-slate-400">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Stream Settings */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-500" />
                Stream Settings
              </h2>

              {/* Stream Type */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                  Meeting Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors">
                    <input
                      type="radio"
                      name="streamType"
                      value="audio_only"
                      checked={streamType === "audio_only"}
                      onChange={() => setStreamType("audio_only")}
                      className="w-4 h-4 accent-sky-500"
                    />
                    <Radio className="w-5 h-5 text-sky-400" />
                    <div>
                      <span className="text-sm font-medium">Audio Only</span>
                      <p className="text-xs text-slate-400">
                        Voice meeting with audio visualization
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors">
                    <input
                      type="radio"
                      name="streamType"
                      value="audio_only"
                      checked={streamType === "video"}
                      onChange={() => setStreamType("video")}
                      className="w-4 h-4 accent-sky-500"
                    />
                    <Video className="w-5 h-5 text-purple-400" />
                    <div>
                      <span className="text-sm font-medium">Video Meeting</span>
                      <p className="text-xs text-slate-400">
                        Full video conference (coming soon)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Max Participants */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Max Participants: {maxParticipants}
                </label>
                <input
                  type="range"
                  min={2}
                  max={100}
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(parseInt(e.target.value))
                  }
                  className="w-full accent-sky-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>2</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            {/* Start Meeting Button */}
            <Button
              onClick={handleCreateMeeting}
              disabled={
                !meetingTitle.trim() || isCreating
              }
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-lg py-6"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting Meeting...
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5 mr-2" />
                  Start Instant Meeting
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - Preview / Tips */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                {/* Thumbnail placeholder */}
                <div className="aspect-video bg-slate-950 rounded-lg mb-4 flex items-center justify-center">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Meeting cover"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-slate-600 text-center">
                      <Video className="w-12 h-12 mx-auto mb-2" />
                      <span className="text-xs">Cover image</span>
                    </div>
                  )}
                </div>

                {/* Meeting Info */}
                <div>
                  <h4 className="font-semibold text-white">
                    {meetingTitle || "Meeting Title"}
                  </h4>
                  {meetingDescription && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {meetingDescription}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Up to {maxParticipants}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {streamType === "audio_only" ? "Audio" : "Video"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4">
                Before you start...
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <span>Allow microphone access in your browser</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <span>Test your audio before joining</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <span>Share the meeting link with participants</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </span>
                  <span>As the host, you can mute participants</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}