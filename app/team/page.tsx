"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Vote,
  Trophy,
  Bell,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pin,
  Send,
  Lock,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Modal } from "@/components/Modal";

export default function TeamDashboardPage() {
  const router = useRouter();

  // Session & Event State
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "voting" | "leaderboard" | "announcements" | "discussion">("overview");

  // Voting State
  const [eligibleTeams, setEligibleTeams] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isBallotSubmitted, setIsBallotSubmitted] = useState(false);
  const [submittedAtTime, setSubmittedAtTime] = useState<string | null>(null);
  const [isSavingRating, setIsSavingRating] = useState<string | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [isSubmittingBallot, setIsSubmittingBallot] = useState(false);
  const [ballotError, setBallotError] = useState<string | null>(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardPublic, setLeaderboardPublic] = useState(false);
  const [isLeaderboardFinal, setIsLeaderboardFinal] = useState(false);

  // Announcements & Discussions
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // 1. Load Session & Event
  const loadInitialData = useCallback(async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (!authData.authenticated || authData.user?.role !== "team") {
        router.push("/login");
        return;
      }
      setSessionUser(authData.user);
      const evId = authData.user.eventId;

      const eventRes = await fetch(`/api/event/status?eventId=${encodeURIComponent(evId || "")}`);
      const eData = await eventRes.json();
      setEventData(eData);

      // If ballot already submitted
      if (authData.user?.submittedAt) {
        setIsBallotSubmitted(true);
        setSubmittedAtTime(authData.user.submittedAt);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Load Voting Data
  const loadVotingData = useCallback(async () => {
    try {
      const [eligRes, mineRes] = await Promise.all([
        fetch("/api/ratings/eligible"),
        fetch("/api/ratings/mine"),
      ]);

      if (eligRes.ok) {
        const eligData = await eligRes.json();
        setEligibleTeams(eligData.eligibleTeams || []);
      }

      if (mineRes.ok) {
        const mineData = await mineRes.json();
        setRatings(mineData.ratings || {});
        if (mineData.isSubmitted) {
          setIsBallotSubmitted(true);
          setSubmittedAtTime(mineData.submittedAt);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 3. Load Leaderboard
  const loadLeaderboardData = useCallback(async () => {
    if (!sessionUser?.eventId) return;
    try {
      const res = await fetch(`/api/leaderboard?eventId=${encodeURIComponent(sessionUser.eventId)}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setLeaderboardPublic(Boolean(data.isVisible));
      setIsLeaderboardFinal(Boolean(data.isFinal));
    } catch (e) {
      console.error(e);
    }
  }, [sessionUser?.eventId]);

  // 4. Load Announcements
  const loadAnnouncements = useCallback(async () => {
    if (!sessionUser?.eventId) return;
    try {
      const res = await fetch(`/api/announcements?eventId=${encodeURIComponent(sessionUser.eventId)}`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (e) {
      console.error(e);
    }
  }, [sessionUser?.eventId]);

  // 5. Load Discussions
  const loadDiscussions = useCallback(async () => {
    if (!sessionUser?.eventId) return;
    try {
      const res = await fetch(`/api/discussions?eventId=${encodeURIComponent(sessionUser.eventId)}`);
      const data = await res.json();
      setDiscussions(data.messages || []);
    } catch (e) {
      console.error(e);
    }
  }, [sessionUser?.eventId]);


  useEffect(() => {
    if (activeTab === "voting") loadVotingData();
    if (activeTab === "leaderboard") loadLeaderboardData();
    if (activeTab === "announcements") loadAnnouncements();
    if (activeTab === "discussion") loadDiscussions();
  }, [activeTab, loadVotingData, loadLeaderboardData, loadAnnouncements, loadDiscussions]);

  // Autosave Rating Change
  const handleSelectScore = async (targetTeamId: string, score: number) => {
    if (isBallotSubmitted) return;

    // Check 10s limit client-side before sending
    if (score === 10) {
      const currentTens = Object.entries(ratings).filter(
        ([tId, s]) => tId !== targetTeamId && s === 10
      ).length;
      if (currentTens >= 5) {
        showFeedback(
          "You can award a rating of 10 to a maximum of 5 teams. 10s used: 5/5.",
          "error"
        );
        return;
      }
    }

    // Optimistic local update
    const previousScore = ratings[targetTeamId];
    setRatings((prev) => ({ ...prev, [targetTeamId]: score }));
    setIsSavingRating(targetTeamId);

    try {
      const res = await fetch("/api/ratings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTeamId, score }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Rollback on error
        setRatings((prev) => {
          const next = { ...prev };
          if (previousScore !== undefined) next[targetTeamId] = previousScore;
          else delete next[targetTeamId];
          return next;
        });
        showFeedback(data.error || "Could not save rating", "error");
      }
    } catch (e: any) {
      showFeedback("Network error saving rating", "error");
    } finally {
      setIsSavingRating(null);
    }
  };

  // Submit Final Ballot
  const handleSubmitBallot = async () => {
    setIsSubmittingBallot(true);
    setBallotError(null);
    try {
      const res = await fetch("/api/ratings/submit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setBallotError(data.error || "Ballot submission failed.");
        return;
      }

      setIsBallotSubmitted(true);
      setSubmittedAtTime(data.submittedAt || new Date().toISOString());
      setSubmitModalOpen(false);
      showFeedback("Your ballot has been submitted successfully!");
    } catch (e: any) {
      setBallotError(e.message || "Failed to submit ballot.");
    } finally {
      setIsSubmittingBallot(false);
    }
  };

  // Post Discussion Message
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setIsSendingMessage(true);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewMessage("");
        loadDiscussions();
        showFeedback("Message posted.");
      } else {
        showFeedback(data.error || "Failed to post message", "error");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#b80000] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">Loading Team Portal...</p>
        </div>
      </div>
    );
  }

  const currentEventStatus = eventData?.event?.status || "DRAFT";
  const teamStatus = sessionUser?.status || "PENDING";
  const isApproved = teamStatus === "APPROVED";

  // Dynamic voting calculations
  const totalEligible = eligibleTeams.length; // N - 1
  const ratedCount = Object.keys(ratings).length;
  const remainingCount = Math.max(0, totalEligible - ratedCount);
  const tensUsed = Object.values(ratings).filter((s) => s === 10).length;
  const tensRemaining = Math.max(0, 5 - tensUsed);
  const isBallotComplete = totalEligible > 0 && ratedCount === totalEligible;

  // Prominent current action calculation
  let actionTitle = "";
  let actionDesc = "";
  let actionButton = null;

  if (teamStatus === "PENDING") {
    actionTitle = "Registration Pending";
    actionDesc = "Your registration is waiting for administrator approval.";
  } else if (teamStatus === "CHANGES_REQUESTED") {
    actionTitle = "Changes Requested";
    actionDesc = sessionUser?.adminFeedback
      ? `Organizer note: "${sessionUser.adminFeedback}"`
      : "The administrator requested updates to your registration.";
  } else if (teamStatus === "REJECTED") {
    actionTitle = "Registration Rejected";
    actionDesc = sessionUser?.adminFeedback
      ? `Reason: "${sessionUser.adminFeedback}"`
      : "Your team registration was not approved.";
  } else if (isApproved) {
    if (currentEventStatus === "REGISTRATION_OPEN" || currentEventStatus === "REGISTRATION_CLOSED" || currentEventStatus === "VOTING_READY") {
      actionTitle = "Registration Approved";
      actionDesc = "Your team is approved and ready for the event. Voting will begin shortly.";
    } else if (currentEventStatus === "VOTING_OPEN") {
      if (isBallotSubmitted) {
        actionTitle = "Voting Complete";
        actionDesc = "Your ballot has been submitted and locked. Thank you!";
      } else {
        actionTitle = "Voting is Open";
        actionDesc = `Your team needs to rate ${totalEligible} other team${totalEligible === 1 ? "" : "s"}. ${ratedCount} rated, ${remainingCount} remaining.`;
        actionButton = (
          <button
            onClick={() => setActiveTab("voting")}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] shadow-2xs transition-all"
          >
            <span>Continue Voting</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        );
      }
    } else if (currentEventStatus === "VOTING_CLOSED" || currentEventStatus === "RESULTS_READY") {
      actionTitle = "Voting Concluded";
      actionDesc = "The voting round has ended. Organizers are preparing the final results.";
    } else if (currentEventStatus === "RESULTS_PUBLISHED") {
      actionTitle = "Final Results Published";
      actionDesc = "The official event rankings are now available on the Leaderboard.";
      actionButton = (
        <button
          onClick={() => setActiveTab("leaderboard")}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] shadow-2xs transition-all"
        >
          <span>View Final Leaderboard</span>
          <Trophy className="w-4 h-4" />
        </button>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        eventName={eventData?.event?.name || "GWD Team Hackathon & Showcase"}
        eventStatus={currentEventStatus}
        userRole="team"
        userLabel={`${sessionUser?.teamName} (${sessionUser?.teamCode})`}
        onLogout={() => router.push("/login")}
      />

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`sticky top-16 z-30 px-4 py-2 text-center text-xs sm:text-sm font-semibold transition-all ${
            feedback.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Prominent Answers: Where am I? What is happening? What do I need to do next? */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Where am I & Who am I */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#b80000] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  Team ID: {sessionUser?.teamCode}
                </span>
                <span className="text-slate-300">•</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                    teamStatus === "APPROVED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : teamStatus === "PENDING"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {teamStatus.replace(/_/g, " ")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {sessionUser?.teamName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Leader: <span className="font-semibold text-slate-800">{sessionUser?.leaderName}</span> ({sessionUser?.leaderEmail})
              </p>
            </div>

            {/* Current Action Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-w-md w-full flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Current Action
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                  {actionTitle}
                </div>
                <div className="text-xs text-slate-600 mt-1">{actionDesc}</div>
              </div>
              {actionButton && <div className="mt-3">{actionButton}</div>}
            </div>
          </div>
        </section>

        {/* Clean Navigation Tabs */}
        <div className="border-b border-slate-200 mb-6 bg-white rounded-t-xl px-2 shadow-2xs overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2 min-w-max py-2">
            {[
              { id: "overview", label: "Overview & Roster", icon: Users },
              {
                id: "voting",
                label: isBallotSubmitted
                  ? "Your Ballot (Submitted)"
                  : `Voting (${ratedCount}/${totalEligible || 0})`,
                icon: Vote,
              },
              { id: "leaderboard", label: "Leaderboard", icon: Trophy },
              { id: "announcements", label: "Announcements", icon: Bell },
              { id: "discussion", label: "Discussion", icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                    isActive
                      ? "bg-red-50 text-[#b80000] border border-red-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#b80000]" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Roster Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Registered Members ({sessionUser?.members?.length || 1})
                </h2>
                <span className="text-xs text-slate-500 font-medium">Official Team Roster</span>
              </div>

              <div className="divide-y divide-slate-100">
                {sessionUser?.members?.map((m: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{m.name}</div>
                      {m.email && <div className="text-xs text-slate-500">{m.email}</div>}
                    </div>
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                      {m.role || "Member"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Guidance Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                Event Guidelines
              </h2>
              <ul className="text-xs text-slate-600 space-y-2.5">
                <li className="flex items-start space-x-2">
                  <span className="text-[#b80000] font-bold">•</span>
                  <span>Each team must rate every other eligible participating team.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#b80000] font-bold">•</span>
                  <span>Ratings range from 1 to 10 integers.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#b80000] font-bold">•</span>
                  <span>A team can award a score of 10 to a maximum of 5 teams.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#b80000] font-bold">•</span>
                  <span>Self-rating is strictly prohibited and blocked by the system.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#b80000] font-bold">•</span>
                  <span>All individual team votes are anonymous and confidential.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: VOTING EXPERIENCE */}
        {activeTab === "voting" && (
          <div className="space-y-6">
            {!isApproved ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
                <Clock className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                <h3 className="text-base font-bold text-slate-900">Registration Pending</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Only approved teams can access the voting ballot. Your registration is awaiting review.
                </p>
              </div>
            ) : currentEventStatus !== "VOTING_OPEN" && !isBallotSubmitted ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
                <Vote className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <h3 className="text-base font-bold text-slate-900">Voting is Not Currently Open</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Current event status: <span className="font-semibold">{currentEventStatus.replace(/_/g, " ")}</span>.
                  Voting will unlock once organizers open the voting phase.
                </p>
              </div>
            ) : (
              <>
                {/* Ballot Status Card & Rules Counter */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#b80000]">
                          Official Ballot
                        </span>
                        {isBallotSubmitted && (
                          <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            <span>BALLOT LOCKED & SUBMITTED</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                        {isBallotSubmitted ? "Your Submitted Ratings" : "Rate Participating Teams"}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {isBallotSubmitted
                          ? `Submitted at ${
                              submittedAtTime ? new Date(submittedAtTime).toLocaleString() : "Confirmed"
                            }. Your ratings are recorded.`
                          : "Ratings save automatically as you click. You must rate every other team before final submission."}
                      </p>
                    </div>

                    {/* Progress Counters */}
                    <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                      <div className="text-center px-2">
                        <div className="text-slate-500 font-medium text-[11px]">Rated</div>
                        <div className="font-extrabold text-slate-900 text-base">
                          {ratedCount} / {totalEligible}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div className="text-center px-2">
                        <div className="text-slate-500 font-medium text-[11px]">Remaining</div>
                        <div
                          className={`font-extrabold text-base ${
                            remainingCount === 0 ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {remainingCount}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div className="text-center px-2">
                        <div className="text-slate-500 font-medium text-[11px]">10s Used</div>
                        <div className="font-extrabold text-[#b80000] text-base">
                          {tensUsed} / 5
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Validation Checklist Banner */}
                  {!isBallotSubmitted && (
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          {isBallotComplete ? (
                            <span className="text-emerald-700 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>All {totalEligible} teams have been rated! Ready to submit.</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium flex items-center space-x-1">
                              <AlertCircle className="w-4 h-4" />
                              <span>
                                {remainingCount} team{remainingCount === 1 ? "" : "s"} still need a rating before final submission.
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          10 ratings remaining: {tensRemaining} / 5
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setBallotError(null);
                          setSubmitModalOpen(true);
                        }}
                        disabled={!isBallotComplete}
                        className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] disabled:bg-slate-300 disabled:cursor-not-allowed shadow-2xs transition-colors"
                      >
                        Submit Final Ballot
                      </button>
                    </div>
                  )}
                </div>

                {/* Eligible Teams Rating Cards */}
                {eligibleTeams.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <h3 className="text-sm font-bold text-slate-900">No other teams to rate yet</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      There are currently no other approved teams in the event.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eligibleTeams.map((team, idx) => {
                      const currentScore = ratings[team.id];
                      const isRated = currentScore !== undefined;
                      const isSaving = isSavingRating === team.id;

                      return (
                        <div
                          key={team.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isRated
                              ? "bg-white border-slate-200 shadow-2xs"
                              : "bg-red-50/20 border-red-200/80"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-bold text-[#b80000] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                  {team.code}
                                </span>
                                <h3 className="text-sm font-bold text-slate-900">{team.name}</h3>
                                {isRated && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                    RATED: {currentScore}
                                  </span>
                                )}
                                {isSaving && (
                                  <span className="text-[10px] text-slate-400 animate-pulse">
                                    Saving...
                                  </span>
                                )}
                              </div>
                              {team.description && (
                                <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">
                                  &quot;{team.description}&quot;
                                </p>
                              )}
                            </div>

                            {/* 1 to 10 Selector Buttons */}
                            <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                const isSelected = currentScore === num;
                                const isTen = num === 10;
                                const isTenDisabled =
                                  !isBallotSubmitted &&
                                  isTen &&
                                  !isSelected &&
                                  tensUsed >= 5;

                                return (
                                  <button
                                    key={num}
                                    type="button"
                                    disabled={isBallotSubmitted || isTenDisabled}
                                    onClick={() => handleSelectScore(team.id, num)}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "bg-[#b80000] text-white shadow-2xs ring-2 ring-red-400"
                                        : isTenDisabled
                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                    }`}
                                    title={
                                      isTenDisabled
                                        ? "5 tens already used"
                                        : `Rate ${num} points`
                                    }
                                  >
                                    {num}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isLeaderboardFinal ? "Final Official Leaderboard" : "Live Event Standings"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isLeaderboardFinal
                    ? "Final validated rankings published by event organizers."
                    : "Real-time standings during active voting."}
                </p>
              </div>
              <button
                onClick={loadLeaderboardData}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {!leaderboardPublic && !isLeaderboardFinal ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Lock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">Leaderboard is currently private</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Organizers have not published the leaderboard yet. Standings will become visible once permitted.
                </p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No rankings calculated yet</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <th className="py-3 px-3 text-center">Rank</th>
                      <th className="py-3 px-3">Team</th>
                      <th className="py-3 px-3 text-right">Average Score</th>
                      <th className="py-3 px-3 text-center">Ratings Count</th>
                      <th className="py-3 px-3 text-center">10s</th>
                      <th className="py-3 px-3 text-center">9s</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {leaderboard.map((item) => {
                      const isCurrent = item.teamId === sessionUser?.teamId;
                      return (
                        <tr
                          key={item.teamId}
                          className={`hover:bg-slate-50/70 ${
                            isCurrent ? "bg-red-50/40 font-bold" : ""
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                item.rank === 1
                                  ? "bg-amber-400 text-slate-900"
                                  : item.rank === 2
                                  ? "bg-slate-300 text-slate-800"
                                  : item.rank === 3
                                  ? "bg-amber-700 text-white"
                                  : "text-slate-500"
                              }`}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-slate-500 mr-2">{item.teamCode}</span>
                            <span className="font-semibold text-slate-900">{item.teamName}</span>
                            {isCurrent && (
                              <span className="ml-2 text-[10px] font-bold text-[#b80000] bg-red-100 px-1.5 py-0.2 rounded">
                                (Your Team)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900 text-sm">
                            {item.avgScore > 0 ? item.avgScore.toFixed(2) : "0.00"}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600">
                            {item.ratingsReceived}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">
                            {item.tensReceived}
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-blue-700">
                            {item.ninesReceived}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Official Announcements</h2>
                <p className="text-xs text-slate-500">
                  Read official guidelines, schedule updates, and notifications from the organizers.
                </p>
              </div>
              <button
                onClick={loadAnnouncements}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No announcements yet</h3>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-lg border transition-all ${
                      ann.is_pinned
                        ? "bg-red-50/40 border-red-200"
                        : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {ann.is_pinned && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#b80000] bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                          <Pin className="w-3 h-3" />
                          <span>PINNED</span>
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                    </div>
                    <p className="mt-2 text-xs text-slate-700 whitespace-pre-line">{ann.content}</p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Posted: {new Date(ann.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GENERAL DISCUSSION */}
        {activeTab === "discussion" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Participant Discussion</h2>
                <p className="text-xs text-slate-500">
                  Connect and chat with other participating teams.
                </p>
              </div>
              <button
                onClick={loadDiscussions}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Post Message Form */}
            {isApproved ? (
              <form onSubmit={handlePostMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Share a question or message with participants..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#b80000] outline-none"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !newMessage.trim()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Only approved teams can post messages in this discussion.
              </p>
            )}

            {/* Message Feed */}
            {discussions.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No discussion messages yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Be the first to post a message to the group.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {discussions.map((msg) => (
                  <div key={msg.id} className="py-3 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{msg.author_name}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-semibold text-[#b80000]">{msg.team_name}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CONFIRMATION MODAL: SUBMIT FINAL BALLOT */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit Final Ballot?"
        description="Are you sure you want to submit your final ratings?"
        confirmLabel="Confirm & Submit Ballot"
        onConfirm={handleSubmitBallot}
        isLoading={isSubmittingBallot}
      >
        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex justify-between">
              <span>Total Teams Required:</span>
              <span className="font-bold">{totalEligible}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Teams Rated:</span>
              <span className="font-bold text-emerald-700">{ratedCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Ratings of 10 Used:</span>
              <span className="font-bold text-[#b80000]">{tensUsed} / 5</span>
            </div>
          </div>

          {ballotError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-semibold">
              {ballotError}
            </div>
          )}

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800">
            <span className="font-bold">Important:</span> Once submitted, your ballot will be permanently locked and cannot be edited.
          </div>
        </div>
      </Modal>
    </div>
  );
}
