"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle,
  Clock,
  Vote,
  Trophy,
  Bell,
  MessageSquare,
  History,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Pin,
  Trash2,
  Send,
  Eye,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  LogOut,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Modal } from "@/components/Modal";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication & Event State
  const [session, setSession] = useState<{ role: string; email: string } | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "registrations" | "teams" | "voting" | "leaderboard" | "announcements" | "discussion" | "audits"
  >("overview");

  // Workflow confirmation modal state
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Registrations section state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regSearch, setRegSearch] = useState("");
  const [regStatusFilter, setRegStatusFilter] = useState("ALL");
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REQUEST_CHANGES" | "REJECT">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Approved teams list
  const [approvedTeams, setApprovedTeams] = useState<any[]>([]);

  // Voting monitor state
  const [votingSummary, setVotingSummary] = useState<any>(null);
  const [votingTeams, setVotingTeams] = useState<any[]>([]);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLeaderboardPublic, setIsLeaderboardPublic] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Discussion state
  const [discussions, setDiscussions] = useState<any[]>([]);

  // Audits state
  const [audits, setAudits] = useState<any[]>([]);

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // 1. Fetch Session & Event Status
  const loadStatus = useCallback(async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (!authData.authenticated || authData.user?.role !== "admin") {
        router.push("/login");
        return;
      }
      setSession(authData.user);

      const statusRes = await fetch("/api/event/status");
      const sData = await statusRes.json();
      setEventData(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // 2. Fetch Section-specific data
  const loadRegistrations = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (regSearch) q.set("search", regSearch);
      if (regStatusFilter !== "ALL") q.set("status", regStatusFilter);
      const res = await fetch(`/api/admin/registrations?${q.toString()}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch (e) {
      console.error(e);
    }
  }, [regSearch, regStatusFilter]);

  const loadApprovedTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teams");
      const data = await res.json();
      setApprovedTeams(data.teams || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadVotingStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/voting-status");
      const data = await res.json();
      setVotingSummary(data.summary || null);
      setVotingTeams(data.teams || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setLeaderboardData(data.leaderboard || []);
      setIsLeaderboardPublic(Boolean(data.leaderboardPublic));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDiscussions = useCallback(async () => {
    try {
      const res = await fetch("/api/discussions");
      const data = await res.json();
      setDiscussions(data.messages || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAudits = useCallback(async () => {
    try {
      const res = await fetch("/api/audits");
      const data = await res.json();
      setAudits(data.audits || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "registrations") loadRegistrations();
    if (activeTab === "teams") loadApprovedTeams();
    if (activeTab === "voting") loadVotingStatus();
    if (activeTab === "leaderboard") loadLeaderboard();
    if (activeTab === "announcements") loadAnnouncements();
    if (activeTab === "discussion") loadDiscussions();
    if (activeTab === "audits") loadAudits();
  }, [
    activeTab,
    loadRegistrations,
    loadApprovedTeams,
    loadVotingStatus,
    loadLeaderboard,
    loadAnnouncements,
    loadDiscussions,
    loadAudits,
  ]);

  // Lifecycle Transition Trigger
  const handleExecuteTransition = async () => {
    if (!eventData?.nextAction?.nextStatus) return;
    setIsTransitioning(true);
    try {
      const res = await fetch("/api/event/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus: eventData.nextAction.nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update state");

      showFeedback(`Event state advanced to ${data.event.status.replace(/_/g, " ")}`);
      setWorkflowModalOpen(false);
      await loadStatus();
      if (activeTab === "voting") loadVotingStatus();
      if (activeTab === "leaderboard") loadLeaderboard();
    } catch (e: any) {
      showFeedback(e.message || "Failed to update event state", "error");
    } finally {
      setIsTransitioning(false);
    }
  };

  // Review Registration handler
  const handleReviewSubmit = async () => {
    if (!selectedReg) return;
    setIsReviewing(true);
    try {
      const res = await fetch(`/api/admin/registrations/${selectedReg.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          feedback: reviewNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review submission failed");

      showFeedback(
        `Team ${selectedReg.code} (${selectedReg.name}) updated: ${reviewAction.replace(/_/g, " ")}`
      );
      setReviewModalOpen(false);
      setSelectedReg(null);
      setReviewNote("");
      loadRegistrations();
      loadStatus();
    } catch (e: any) {
      showFeedback(e.message || "Failed to review team", "error");
    } finally {
      setIsReviewing(false);
    }
  };

  // Toggle Leaderboard Public
  const handleToggleLeaderboardPublic = async () => {
    setIsTogglingPublish(true);
    try {
      const res = await fetch("/api/leaderboard/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isLeaderboardPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Toggle failed");
      setIsLeaderboardPublic(data.leaderboardPublic);
      showFeedback(
        data.leaderboardPublic
          ? "Leaderboard published to teams and participants."
          : "Leaderboard visibility restricted to administrators."
      );
    } catch (e: any) {
      showFeedback(e.message || "Action failed", "error");
    } finally {
      setIsTogglingPublish(false);
    }
  };

  // Announcement handlers
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSavingAnnouncement(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          is_pinned: newIsPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create announcement");

      showFeedback("Announcement published successfully.");
      setAnnouncementModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewIsPinned(false);
      loadAnnouncements();
    } catch (e: any) {
      showFeedback(e.message || "Error creating announcement", "error");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleTogglePinAnnouncement = async (id: string) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) loadAnnouncements();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showFeedback("Announcement deleted.");
        loadAnnouncements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Discussion moderation
  const handleDeleteDiscussion = async (id: string) => {
    if (!confirm("Delete this discussion message?")) return;
    try {
      const res = await fetch(`/api/discussions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showFeedback("Message deleted.");
        loadDiscussions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#b80000] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">Loading Administrator Center...</p>
        </div>
      </div>
    );
  }

  const currentStatus = eventData?.event?.status || "DRAFT";
  const nextAction = eventData?.nextAction;
  const statusDesc = eventData?.statusDescription;
  const stats = eventData?.stats;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        eventName={eventData?.event?.name || "GWD Team Hackathon & Showcase"}
        eventStatus={currentStatus}
        userRole="admin"
        userLabel={session?.email || "Administrator"}
        onLogout={() => router.push("/login")}
      />

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`sticky top-16 z-30 px-4 py-2.5 text-center text-sm font-semibold transition-all shadow-xs ${
            feedbackMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Control Bar: Answers "Where am I?", "What is happening?", "What do I need to do next?" */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Where am I & What is happening */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#b80000]">
                  GWD Control Center
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {eventData?.event?.name}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-3">
                <span>{statusDesc?.title || currentStatus.replace(/_/g, " ")}</span>
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                {statusDesc?.subtitle || "Manage event lifecycle, registrations, and voting."}
              </p>
            </div>

            {/* What do I need to do next? (Single Prominent Primary Action) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {nextAction?.nextStatus ? (
                <button
                  onClick={() => setWorkflowModalOpen(true)}
                  className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-lg text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] shadow-sm transition-all group"
                >
                  <span>{nextAction.actionLabel}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <div className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  Event Completed
                </div>
              )}

              <button
                onClick={loadStatus}
                title="Refresh Status"
                className="p-3 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="sr-only">Refresh</span>
              </button>
            </div>
          </div>

          {/* "What happens next?" Guidance Card */}
          <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-red-50/50 -mx-6 -mb-6 p-4 rounded-b-xl border-b border-red-100/50">
            <div className="text-xs sm:text-sm text-slate-700">
              <span className="font-bold text-[#b80000] mr-1.5">What happens next:</span>
              <span>{statusDesc?.whatHappensNext}</span>
            </div>
            {currentStatus === "REGISTRATION_OPEN" && (
              <button
                onClick={() => setActiveTab("registrations")}
                className="text-xs font-bold text-[#b80000] hover:underline self-start sm:self-auto flex items-center space-x-1"
              >
                <span>Review Registrations</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {currentStatus === "VOTING_OPEN" && (
              <button
                onClick={() => setActiveTab("voting")}
                className="text-xs font-bold text-[#b80000] hover:underline self-start sm:self-auto flex items-center space-x-1"
              >
                <span>Monitor Voting</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </section>

        {/* Small Set of Real Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Teams Registered
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {stats?.teamsRegistered ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats?.totalMembers ?? 0} total members
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Review
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-2">
              {stats?.pendingReview ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Waiting organizer review
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Approved Teams
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-2">
              {stats?.approvedTeams ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Eligible for event rating
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Voting Ballots
              </span>
              <Vote className="w-4 h-4 text-[#b80000]" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {stats?.voting?.submitted ?? 0} / {stats?.voting?.totalEligibleVoters ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats?.voting?.completionPercent ?? 0}% completed
            </div>
          </div>
        </div>

        {/* Clean Admin Navigation Tabs */}
        <div className="border-b border-slate-200 mb-6 bg-white rounded-t-xl px-2 shadow-2xs overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2 min-w-max py-2">
            {[
              { id: "overview", label: "Overview", icon: ShieldCheck },
              {
                id: "registrations",
                label: `Registrations (${stats?.teamsRegistered ?? 0})`,
                icon: Users,
              },
              {
                id: "teams",
                label: `Approved Teams (${stats?.approvedTeams ?? 0})`,
                icon: CheckCircle,
              },
              { id: "voting", label: "Voting Monitor", icon: Vote },
              { id: "leaderboard", label: "Leaderboard", icon: Trophy },
              { id: "announcements", label: "Announcements", icon: Bell },
              { id: "discussion", label: "Discussion", icon: MessageSquare },
              { id: "audits", label: "Activity Log", icon: History },
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
          <div className="space-y-6">
            {/* Event Workflow Stepper */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Event Lifecycle Progress
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {[
                  { key: "DRAFT", label: "Draft" },
                  { key: "REGISTRATION_OPEN", label: "Registration" },
                  { key: "REGISTRATION_CLOSED", label: "Reg Closed" },
                  { key: "VOTING_READY", label: "Voting Ready" },
                  { key: "VOTING_OPEN", label: "Voting Live" },
                  { key: "VOTING_CLOSED", label: "Voting Closed" },
                  { key: "RESULTS_READY", label: "Results Ready" },
                  { key: "RESULTS_PUBLISHED", label: "Published" },
                ].map((step, idx) => {
                  const isCurrent = currentStatus === step.key;
                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isCurrent
                          ? "bg-red-50 border-[#b80000] ring-1 ring-[#b80000]"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-400">Step {idx + 1}</div>
                      <div
                        className={`text-xs font-bold mt-0.5 truncate ${
                          isCurrent ? "text-[#b80000]" : "text-slate-700"
                        }`}
                      >
                        {step.label}
                      </div>
                      {isCurrent && (
                        <div className="mt-1 text-[9px] uppercase font-bold text-[#b80000] bg-white border border-red-200 rounded px-1 py-0.2">
                          ACTIVE
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-bold">
                  <Users className="w-5 h-5 text-[#b80000]" />
                  <span>Team Registrations</span>
                </div>
                <p className="text-xs text-slate-600">
                  You have <span className="font-bold text-slate-900">{stats?.pendingReview ?? 0}</span> registrations waiting for review out of {stats?.teamsRegistered ?? 0} total.
                </p>
                <button
                  onClick={() => setActiveTab("registrations")}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
                >
                  Manage Registrations &rarr;
                </button>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-bold">
                  <Trophy className="w-5 h-5 text-[#b80000]" />
                  <span>Leaderboard Visibility</span>
                </div>
                <p className="text-xs text-slate-600">
                  Leaderboard is currently{" "}
                  <span
                    className={`font-bold ${
                      isLeaderboardPublic ? "text-emerald-700" : "text-slate-700"
                    }`}
                  >
                    {isLeaderboardPublic ? "PUBLIC (Visible to teams)" : "RESTRICTED (Admin only)"}
                  </span>
                  .
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleToggleLeaderboardPublic}
                    disabled={isTogglingPublish}
                    className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg text-white bg-[#b80000] hover:bg-[#990000] transition-colors"
                  >
                    {isLeaderboardPublic ? "Make Restricted" : "Publish to Teams"}
                  </button>
                  <button
                    onClick={() => setActiveTab("leaderboard")}
                    className="py-2 px-3 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    View Standings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTRATION MANAGEMENT */}
        {activeTab === "registrations" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Team ID, name, leader..."
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Status:</span>
                <select
                  value={regStatusFilter}
                  onChange={(e) => setRegStatusFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#b80000]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="CHANGES_REQUESTED">Changes Requested</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button
                  onClick={loadRegistrations}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Registrations Table */}
            {registrations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No registrations found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {regSearch || regStatusFilter !== "ALL"
                    ? "No teams match your filter criteria. Try clearing the search or status filter."
                    : "No teams have registered yet. Once teams register, they will appear here for your review."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider">
                      <th className="py-3 px-4">Team ID</th>
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-4">Leader & Contact</th>
                      <th className="py-3 px-4 text-center">Members</th>
                      <th className="py-3 px-4">Submitted</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {reg.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {reg.name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{reg.leaderName}</div>
                          <div className="text-[11px] text-slate-500">{reg.leaderEmail}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {reg.memberCount}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(reg.registeredAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              reg.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : reg.status === "PENDING"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : reg.status === "CHANGES_REQUESTED"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            {reg.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedReg(reg);
                              setReviewAction(reg.status === "APPROVED" ? "REQUEST_CHANGES" : "APPROVE");
                              setReviewNote(reg.adminFeedback || "");
                              setReviewModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-[#b80000] transition-colors"
                          >
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPROVED TEAMS */}
        {activeTab === "teams" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Approved Participating Teams ({approvedTeams.length})
                </h2>
                <p className="text-xs text-slate-500">
                  These teams are eligible to rate and be rated in the event.
                </p>
              </div>
              <button
                onClick={loadApprovedTeams}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {approvedTeams.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <CheckCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No approved teams yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  When you approve team registrations from the Registrations tab, they will be listed here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-2xs transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-[#b80000] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                          {team.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">{team.name}</h3>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Approved
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Leader:</span> {team.leaderName} ({team.leaderEmail})
                    </div>

                    {team.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 italic">
                        &quot;{team.description}&quot;
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Roster: {team.memberCount} members</span>
                      <span>
                        {team.submittedAt ? (
                          <span className="font-semibold text-emerald-600">Ballot Submitted</span>
                        ) : (
                          <span className="text-slate-400">Ballot Pending</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VOTING MONITOR */}
        {activeTab === "voting" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live Voting & Ballot Monitor
                </h2>
                <p className="text-xs text-slate-500">
                  Track dynamic rating progress and final ballot submissions across all approved teams.
                </p>
              </div>
              <button
                onClick={loadVotingStatus}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Live Ballots</span>
              </button>
            </div>

            {/* Voting Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
              <div>
                <div className="text-xs text-slate-500 font-medium">Eligible Voters (N)</div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {votingSummary?.totalEligibleVoters ?? 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Ratings Required (N - 1)</div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {votingSummary?.totalRequiredPerTeam ?? 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Ballots Submitted</div>
                <div className="text-xl font-extrabold text-emerald-700 mt-1">
                  {votingSummary?.submittedCount ?? 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Completion Rate</div>
                <div className="text-xl font-extrabold text-[#b80000] mt-1">
                  {votingSummary?.completionPercent ?? 0}%
                </div>
              </div>
            </div>

            {/* Voting Status List */}
            {votingTeams.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Vote className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No voting activity yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Once you approve at least 2 teams and advance to &quot;Voting Open&quot;, team ballots will stream live here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <th className="py-2.5 px-3">Team ID</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-3">Progress</th>
                      <th className="py-2.5 px-3">10s Used</th>
                      <th className="py-2.5 px-3">Ballot Status</th>
                      <th className="py-2.5 px-3 text-right">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {votingTeams.map((vt) => (
                      <tr key={vt.teamId} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {vt.teamCode}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {vt.teamName}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-slate-800">
                              {vt.ratedCount} / {vt.totalRequired}
                            </span>
                            <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#b80000] h-full rounded-full transition-all"
                                style={{
                                  width: `${
                                    vt.totalRequired > 0
                                      ? Math.min(100, (vt.ratedCount / vt.totalRequired) * 100)
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {vt.tensUsed} / 5
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              vt.status === "SUBMITTED"
                                ? "bg-emerald-100 text-emerald-800"
                                : vt.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {vt.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                          {vt.submittedAt
                            ? new Date(vt.submittedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Event Leaderboard & Standings
                </h2>
                <p className="text-xs text-slate-500">
                  Computed by official ranking rules: 1. Highest Average, 2. Most 10s, 3. Most 9s.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleToggleLeaderboardPublic}
                  disabled={isTogglingPublish}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors ${
                    isLeaderboardPublic
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-[#b80000] hover:bg-[#990000]"
                  }`}
                >
                  {isLeaderboardPublic ? "Unpublish (Hide from Teams)" : "Publish Official Leaderboard"}
                </button>
                <button
                  onClick={loadLeaderboard}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {leaderboardData.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">Results are not available yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  When voting starts and teams submit ratings, the calculated rankings will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <th className="py-3 px-3 text-center">Rank</th>
                      <th className="py-3 px-3">Team ID</th>
                      <th className="py-3 px-3">Team Name</th>
                      <th className="py-3 px-3 text-right">Average Rating</th>
                      <th className="py-3 px-3 text-center">Ratings Received</th>
                      <th className="py-3 px-3 text-center">10s</th>
                      <th className="py-3 px-3 text-center">9s</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {leaderboardData.map((item) => (
                      <tr
                        key={item.teamId}
                        className={`hover:bg-slate-50/70 ${
                          item.rank === 1
                            ? "bg-amber-50/40 font-semibold"
                            : item.rank === 2
                            ? "bg-slate-50/50"
                            : item.rank === 3
                            ? "bg-amber-50/20"
                            : ""
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
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {item.teamCode}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.teamName}
                          {item.isTied && (
                            <span className="ml-2 text-[10px] text-slate-400 font-normal">
                              (Tied)
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Official Announcements</h2>
                <p className="text-xs text-slate-500">
                  Broadcast notices directly to all teams and participants.
                </p>
              </div>
              <button
                onClick={() => setAnnouncementModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors"
              >
                <span>Create Announcement</span>
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No announcements yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Click &quot;Create Announcement&quot; above to post official guidelines or schedule updates.
                </p>
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
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {ann.is_pinned && (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#b80000] bg-red-100/70 border border-red-200 px-1.5 py-0.5 rounded">
                            <Pin className="w-3 h-3" />
                            <span>PINNED</span>
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleTogglePinAnnouncement(ann.id)}
                          className="p-1 text-slate-400 hover:text-[#b80000] transition-colors"
                          title={ann.is_pinned ? "Unpin" : "Pin to top"}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-700 whitespace-pre-line">
                      {ann.content}
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Posted: {new Date(ann.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: DISCUSSION MODERATION */}
        {activeTab === "discussion" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  General Discussion Moderation
                </h2>
                <p className="text-xs text-slate-500">
                  Review and moderate community messages from approved teams.
                </p>
              </div>
              <button
                onClick={loadDiscussions}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {discussions.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No discussion messages yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  When approved team members post in the community forum, their messages will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {discussions.map((msg) => (
                  <div key={msg.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          {msg.author_name}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-[#b80000] font-semibold">
                          {msg.team_name}
                        </span>
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

                    <button
                      onClick={() => handleDeleteDiscussion(msg.id)}
                      className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      title="Moderate / Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: ACTIVITY LOG (AUDITS) */}
        {activeTab === "audits" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Activity History</h2>
                <p className="text-xs text-slate-500">
                  Audit trail of all administrative actions, lifecycle state changes, and team submissions.
                </p>
              </div>
              <button
                onClick={loadAudits}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {audits.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No activity recorded yet</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                    {audits.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(a.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{a.actor}</td>
                        <td className="py-2 px-3 text-[#b80000] font-bold">{a.action}</td>
                        <td className="py-2 px-3 text-slate-600 font-sans text-xs">
                          {a.details ? JSON.stringify(a.details) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Confirm Lifecycle Transition */}
      <Modal
        isOpen={workflowModalOpen}
        onClose={() => setWorkflowModalOpen(false)}
        title={nextAction?.confirmTitle || "Advance Event State?"}
        description={nextAction?.confirmDescription}
        confirmLabel={nextAction?.actionLabel || "Confirm"}
        confirmVariant={
          currentStatus === "VOTING_OPEN" || currentStatus === "REGISTRATION_OPEN"
            ? "danger"
            : "primary"
        }
        onConfirm={handleExecuteTransition}
        isLoading={isTransitioning}
      >
        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
          <p className="font-semibold text-slate-800">
            Transitioning: <span className="text-[#b80000]">{currentStatus.replace(/_/g, " ")}</span> &rarr;{" "}
            <span className="text-emerald-700 font-bold">{nextAction?.nextStatus?.replace(/_/g, " ")}</span>
          </p>
          <p className="mt-1">
            This action will update the active event stage for all teams and participants.
          </p>
        </div>
      </Modal>

      {/* MODAL 2: Review Registration (Approve / Request Changes / Reject) */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Review Registration: ${selectedReg?.code || ""}`}
        confirmLabel={
          reviewAction === "APPROVE"
            ? "Approve Team"
            : reviewAction === "REQUEST_CHANGES"
            ? "Request Changes"
            : "Reject Registration"
        }
        confirmVariant={reviewAction === "REJECT" ? "danger" : "primary"}
        onConfirm={handleReviewSubmit}
        isLoading={isReviewing}
      >
        {selectedReg && (
          <div className="space-y-4 text-xs text-slate-700">
            {/* Team summary card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div>
                <span className="font-bold text-slate-900">Team Name:</span> {selectedReg.name}
              </div>
              <div>
                <span className="font-bold text-slate-900">Leader:</span> {selectedReg.leaderName} ({selectedReg.leaderEmail})
              </div>
              {selectedReg.contact && (
                <div>
                  <span className="font-bold text-slate-900">Contact:</span> {selectedReg.contact}
                </div>
              )}
              {selectedReg.description && (
                <div className="pt-1 text-slate-600 italic">
                  &quot;{selectedReg.description}&quot;
                </div>
              )}
            </div>

            {/* Roster list */}
            <div>
              <div className="font-bold text-slate-900 mb-1">
                Submitted Members ({selectedReg.members?.length || 1}):
              </div>
              <ul className="divide-y divide-slate-100 bg-slate-50 rounded border border-slate-200 max-h-36 overflow-y-auto">
                {selectedReg.members?.map((m: any, i: number) => (
                  <li key={i} className="px-3 py-1.5 flex justify-between">
                    <span className="font-medium text-slate-800">{m.name}</span>
                    <span className="text-slate-500">{m.role || "Member"}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Review Decision Buttons */}
            <div>
              <div className="font-bold text-slate-900 mb-1.5">Administrative Decision:</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction("APPROVE")}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    reviewAction === "APPROVE"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Approve Team
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("REQUEST_CHANGES")}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    reviewAction === "REQUEST_CHANGES"
                      ? "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("REJECT")}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    reviewAction === "REJECT"
                      ? "bg-red-50 text-red-800 border-red-300 ring-1 ring-red-400"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Reject Team
                </button>
              </div>
            </div>

            {/* Feedback / Note field */}
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                {reviewAction === "REQUEST_CHANGES"
                  ? "Changes Requested Note (Required):"
                  : "Organizer Feedback / Note (Optional):"}
              </label>
              <textarea
                rows={2}
                placeholder={
                  reviewAction === "REQUEST_CHANGES"
                    ? "Explain what information the team needs to update..."
                    : "Optional note for records..."
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000] bg-white text-xs"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Create Announcement */}
      <Modal
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        title="Create Official Announcement"
        confirmLabel="Publish Announcement"
        onConfirm={handleCreateAnnouncement as any}
        isLoading={isSavingAnnouncement}
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Announcement Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Voting Round Begins at 3:00 PM"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Announcement Message *</label>
            <textarea
              rows={4}
              required
              placeholder="Type your official announcement here..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="pin_ann"
              checked={newIsPinned}
              onChange={(e) => setNewIsPinned(e.target.checked)}
              className="rounded text-[#b80000] focus:ring-[#b80000]"
            />
            <label htmlFor="pin_ann" className="text-xs font-semibold text-slate-800">
              Pin to top of announcements list
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
