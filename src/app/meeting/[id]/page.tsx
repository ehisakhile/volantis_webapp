"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Loader2,
  AlertCircle,
  X,
  Crown,
  Video,
  Clock,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { meetingsApi } from "@/lib/api/meetings";
import { useAuth } from "@/lib/auth-context";
import { HostMeeting } from "@/components/meeting/host-meeting";
import { ParticipantMeeting } from "@/components/meeting/participant-meeting";
import type { VolMeetingOut } from "@/types/meeting";
import { parse } from "path";

function MeetingPageContent() {
  const router = useRouter();
  const params = useParams();
  const meetingId = (params.id as string);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [meeting, setMeeting] = useState<VolMeetingOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinedRole, setJoinedRole] = useState<
    "host" | "co_host" | "participant"
  >("participant");
  const [selectedRole, setSelectedRole] = useState<
    "host" | "co_host" | "participant"
  >("participant");

  const errorToMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err && "detail" in err) {
      const detail = (err as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((item) =>
            typeof item === "object" && item && "msg" in item
              ? String((item as { msg: unknown }).msg)
              : String(item)
          )
          .join(", ");
      }
    }
    return fallback;
  };

  // Auth check and meeting fetch
  useEffect(() => {
    const fetchMeeting = async () => {
     

      setIsLoading(true);
      try {
        const meetingData = await meetingsApi.joinMeeting(meetingId);
        setMeeting(meetingData);
      } catch (err) {
        console.error("Failed to fetch meeting:", err);
        setError(
          errorToMessage(
            err,
            "Failed to load meeting. Please check the link and try again."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId, isAuthenticated]);

  // Handle join as participant
  const handleJoinAsParticipant = useCallback(async () => {
    if (!meeting) return;

    setIsJoining(true);
    setError(null);

    try {
      const updatedMeeting = await meetingsApi.joinMeeting(
        meeting.id,
        selectedRole
      );
      setMeeting(updatedMeeting);
      setJoinedRole(selectedRole);
      setHasJoined(true);
    } catch (err) {
      console.error("Failed to join meeting:", err);
      setError(
        errorToMessage(err, "Failed to join meeting. Please try again.")
      );
    } finally {
      setIsJoining(false);
    }
  }, [meeting, selectedRole]);

  // Handle meeting ended (for hosts)
  const handleMeetingEnded = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // Handle left meeting (for participants)
  const handleLeftMeeting = useCallback(() => {
    router.push("/");
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading meeting...</p>
          <p className="text-slate-400 text-sm mt-2">
            Please wait while we connect you
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Unable to Join Meeting
          </h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-sky-500 hover:bg-sky-600"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // Meeting not found
  if (!meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Meeting Not Found
          </h1>
          <p className="text-slate-400 mb-6">
            This meeting may have ended or the link is incorrect.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="bg-sky-500 hover:bg-sky-600"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // Render meeting views once the user has explicitly joined.
  if (meeting.status === "active" && hasJoined) {
    if (joinedRole === "host" || joinedRole === "co_host") {
      return (
        <HostMeeting
          meeting={meeting}
          onMeetingEnded={handleMeetingEnded}
          onError={setError}
        />
      );
    } else {
      return (
        <ParticipantMeeting
          meeting={meeting}
          onLeft={handleLeftMeeting}
          onError={setError}
        />
      );
    }
  }

  const canJoin = meeting.status === "active" || meeting.status === "pending";
  const joinLabel = meeting.status === "active" ? "Join Meeting" : "Join When Ready";
  const meetingTypeLabel =
    meeting.stream_type === "audio_only" ? "Audio room" : "Video room";

  // Pre-join screen.
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_30%)]" />
      <div className="relative max-w-4xl w-full">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-slate-950/40 backdrop-blur"
        >
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    meeting.status === "active" && "bg-emerald-500/15 text-emerald-300",
                    meeting.status === "pending" && "bg-yellow-500/15 text-yellow-300",
                    meeting.status === "ended" && "bg-slate-500/20 text-slate-300",
                    meeting.status === "cancelled" && "bg-red-500/15 text-red-300"
                  )}
                >
                  {meeting.status === "active" && <Radio className="h-3 w-3" />}
                  {meeting.status === "pending" && <Clock className="h-3 w-3" />}
                  {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                  {meetingTypeLabel}
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-normal text-white sm:text-4xl">
                {meeting.title}
              </h1>
              {meeting.description && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  {meeting.description}
                </p>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Users className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="text-2xl font-semibold text-white">
                    {meeting.participant_count}
                  </p>
                  <p className="text-xs text-slate-400">Participants</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Video className="mb-3 h-5 w-5 text-emerald-300" />
                  <p className="text-sm font-semibold text-white">{meetingTypeLabel}</p>
                  <p className="text-xs text-slate-400">Session type</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Crown className="mb-3 h-5 w-5 text-yellow-300" />
                  <p className="truncate text-sm font-semibold text-white">
                    {meeting.company_name || "Meeting Host"}
                  </p>
                  <p className="text-xs text-slate-400">Host</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-slate-950/50 p-6 sm:p-8 lg:border-l lg:border-t-0">
              {isAuthenticated && (
                <div className="mb-6">
                  <p className="mb-3 text-sm font-medium text-slate-300">
                    Join as
                  </p>
                  <div className="grid gap-2">
                    {(["participant", "host"] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition",
                          selectedRole === role
                            ? "border-sky-400 bg-sky-500/10 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
                        )}
                      >
                        {role === "host" ? (
                          <Crown className="h-5 w-5" />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                        <span className="font-medium">
                          {role === "host" ? "Host / Co-host" : "Participant"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <AlertCircle className="h-4 w-4 text-red-300" />
                  <span className="text-sm text-red-200">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {canJoin ? (
                <Button
                  onClick={handleJoinAsParticipant}
                  disabled={isJoining || authLoading}
                  className="w-full bg-sky-500 py-6 text-base hover:bg-sky-600"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-5 w-5" />
                      {joinLabel}
                    </>
                  )}
                </Button>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-5 text-center text-sm text-slate-400">
                  This meeting has {meeting.status}.
                </div>
              )}

              <p className="mt-4 text-center text-xs text-slate-500">
                Meeting ID: {meeting.id}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Wrap with Suspense since useParams might be async in some Next.js versions
export default function MeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      }
    >
      <MeetingPageContent />
    </Suspense>
  );
}
