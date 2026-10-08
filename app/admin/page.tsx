"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  Copy,
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
  Lock,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Modal } from "@/components/Modal";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication & Global Multi-Event State
  const [session, setSession] = useState<{ role: string; email: string } | null>(null);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "events" | "registrations" | "teams" | "voting" | "leaderboard" | "announcements" | "discussion" | "audits"
  >("overview");

  // Workflow confirmation modal state
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Create Event 6-Step Setup Modal
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newRegStart, setNewRegStart] = useState("");
  const [newRegEnd, setNewRegEnd] = useState("");
  const [newVotingStart, setNewVotingStart] = useState("");
  const [newVotingEnd, setNewVotingEnd] = useState("");
  const [newMaxTens, setNewMaxTens] = useState<number>(5);
  const [newLeaderboardPublic, setNewLeaderboardPublic] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Duplicate Event Modal
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateSourceEvent, setDuplicateSourceEvent] = useState<any | null>(null);
  const [duplicateEventName, setDuplicateEventName] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Registrations section state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regSearch, setRegSearch] = useState("");
  const [regStatusFilter, setRegStatusFilter] = useState("ALL");
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REQUEST_CHANGES" | "REJECT">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Ballot Unlock Modal
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockTargetTeam, setUnlockTargetTeam] = useState<any | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

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
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Edit Event Settings Modal
  const [editSettingsModalOpen, setEditSettingsModalOpen] = useState(false);
  const [editSettingsData, setEditSettingsData] = useState<{
    name: string;
    description: string;
    max_tens: number;
    leaderboard_visibility: string;
    discussion_enabled: boolean;
    announcements_enabled: boolean;
    allow_member_edits: boolean;
    registration_start: string;
    registration_end: string;
    voting_start: string;
    voting_end: string;
  }>({
    name: "",
    description: "",
    max_tens: 5,
    leaderboard_visibility: "PUBLIC",
    discussion_enabled: true,
    announcements_enabled: true,
    allow_member_edits: true,
    registration_start: "",
    registration_end: "",
    voting_start: "",
    voting_end: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Deactivate / Reactivate Event State
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Reset Ballot Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetTeam, setResetTargetTeam] = useState<any | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [isResetting, setIsResetting] = useState(false);

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

  // 1. Fetch Session & Events List
  const loadEventsAndSession = useCallback(async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (!authData.authenticated || authData.user?.role !== "admin") {
        router.push("/login");
        return;
      }
      setSession(authData.user);

      const eventsRes = await fetch("/api/admin/events");
      const eventsData = await eventsRes.json();
      const list = eventsData.events || [];
      setEventsList(list);

      const activeId = eventsData.activeEventId || list[0]?.id || "";
      setSelectedEventId((prev) => (prev && list.some((e: any) => e.id === prev) ? prev : activeId));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadEventsAndSession();
  }, [loadEventsAndSession]);

  // 2. Load Selected Event Details
  const loadEventStatus = useCallback(async (evId: string) => {
    if (!evId) return;
    try {
      const res = await fetch(`/api/event/status?eventId=${encodeURIComponent(evId)}`);
      const sData = await res.json();
      setEventData(sData);
      setIsLeaderboardPublic(Boolean(sData?.event?.leaderboard_public));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventStatus(selectedEventId);
    }
  }, [selectedEventId, loadEventStatus]);

  // 3. Section Data Loaders (Strictly scoped by selectedEventId!)
  const loadRegistrations = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const q = new URLSearchParams({ eventId: selectedEventId });
      if (regSearch) q.set("search", regSearch);
      if (regStatusFilter !== "ALL") q.set("status", regStatusFilter);
      const res = await fetch(`/api/admin/registrations?${q.toString()}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId, regSearch, regStatusFilter]);

  const loadApprovedTeams = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/admin/teams?eventId=${encodeURIComponent(selectedEventId)}`);
      const data = await res.json();
      setApprovedTeams(data.teams || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId]);

  const loadVotingStatus = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/admin/voting-status?eventId=${encodeURIComponent(selectedEventId)}`);
      const data = await res.json();
      setVotingSummary(data.summary || null);
      setVotingTeams(data.teams || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId]);

  const loadLeaderboard = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/leaderboard?eventId=${encodeURIComponent(selectedEventId)}`);
      const data = await res.json();
      setLeaderboardData(data.leaderboard || []);
      setIsLeaderboardPublic(Boolean(data.leaderboardPublic));
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId]);

  const loadAnnouncements = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/announcements?eventId=${encodeURIComponent(selectedEventId)}`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId]);

  const loadDiscussions = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/discussions?eventId=${encodeURIComponent(selectedEventId)}`);
      const data = await res.json();
      setDiscussions(data.messages || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId]);

  const loadAudits = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/audits?eventId=${encodeURIComponent(selectedEventId)}`);
      const data = await res.json();
      setAudits(data.audits || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId]);

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
    selectedEventId,
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
    if (!eventData?.nextAction?.nextStatus || !selectedEventId) return;
    setIsTransitioning(true);
    try {
      const res = await fetch("/api/event/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          targetStatus: eventData.nextAction.nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update state");

      showFeedback(`Event state advanced to ${data.event.status.replace(/_/g, " ")}`);
      setWorkflowModalOpen(false);
      await loadEventStatus(selectedEventId);
      await loadEventsAndSession();
      if (activeTab === "voting") loadVotingStatus();
      if (activeTab === "leaderboard") loadLeaderboard();
    } catch (e: any) {
      showFeedback(e.message || "Failed to update event state", "error");
    } finally {
      setIsTransitioning(false);
    }
  };

  // Create Event Submit
  const handleCreateEventSubmit = async () => {
    if (!newEventName.trim()) {
      showFeedback("Event name is required.", "error");
      return;
    }
    setIsCreatingEvent(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEventName,
          description: newEventDesc,
          max_tens: newMaxTens,
          leaderboard_public: newLeaderboardPublic,
          registration_start: newRegStart,
          registration_end: newRegEnd,
          voting_start: newVotingStart,
          voting_end: newVotingEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Event creation failed");

      showFeedback(`Event "${data.event.name}" created successfully in Draft mode!`);
      setCreateEventModalOpen(false);
      setCreateStep(1);
      setNewEventName("");
      setNewEventDesc("");
      await loadEventsAndSession();
      setSelectedEventId(data.event.id);
      setActiveTab("overview");
    } catch (e: any) {
      showFeedback(e.message || "Failed to create event", "error");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Duplicate Event Settings
  const handleDuplicateSubmit = async () => {
    if (!duplicateSourceEvent) return;
    setIsDuplicating(true);
    try {
      const res = await fetch("/api/admin/events/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEventId: duplicateSourceEvent.id,
          customName: duplicateEventName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplication failed");

      showFeedback(
        `Settings duplicated to new event "${data.event.name}". Zero historical teams or votes copied.`
      );
      setDuplicateModalOpen(false);
      setDuplicateSourceEvent(null);
      await loadEventsAndSession();
      setSelectedEventId(data.event.id);
      setActiveTab("overview");
    } catch (e: any) {
      showFeedback(e.message || "Failed to duplicate settings", "error");
    } finally {
      setIsDuplicating(false);
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
      loadEventStatus(selectedEventId);
    } catch (e: any) {
      showFeedback(e.message || "Failed to review team", "error");
    } finally {
      setIsReviewing(false);
    }
  };

  // Ballot Unlock handler
  const handleUnlockSubmit = async () => {
    if (!unlockTargetTeam || !unlockReason.trim()) return;
    setIsUnlocking(true);
    try {
      const res = await fetch(`/api/admin/teams/${unlockTargetTeam.teamId || unlockTargetTeam.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unlockReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unlock ballot");

      showFeedback(`Ballot for ${unlockTargetTeam.teamName || unlockTargetTeam.name} unlocked.`);
      setUnlockModalOpen(false);
      setUnlockTargetTeam(null);
      setUnlockReason("");
      loadVotingStatus();
      loadEventStatus(selectedEventId);
    } catch (e: any) {
      showFeedback(e.message || "Error unlocking ballot", "error");
    } finally {
      setIsUnlocking(false);
    }
  };

  // Toggle Leaderboard Public
  const handleToggleLeaderboardPublic = async () => {
    if (!selectedEventId) return;
    setIsTogglingPublish(true);
    try {
      const res = await fetch("/api/leaderboard/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          isPublic: !isLeaderboardPublic,
        }),
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
    if (!newTitle.trim() || !newContent.trim() || !selectedEventId) return;
    setIsSavingAnnouncement(true);
    try {
      const isEdit = Boolean(editingAnnouncement);
      const url = "/api/announcements";
      const method = isEdit ? "PATCH" : "POST";
      const bodyPayload = isEdit
        ? {
            id: editingAnnouncement.id,
            eventId: selectedEventId,
            title: newTitle,
            content: newContent,
            is_pinned: newIsPinned,
          }
        : {
            eventId: selectedEventId,
            title: newTitle,
            content: newContent,
            is_pinned: newIsPinned,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save announcement");

      showFeedback(isEdit ? "Announcement updated successfully." : "Announcement published successfully.");
      setAnnouncementModalOpen(false);
      setEditingAnnouncement(null);
      setNewTitle("");
      setNewContent("");
      setNewIsPinned(false);
      loadAnnouncements();
    } catch (e: any) {
      showFeedback(e.message || "Error saving announcement", "error");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleTogglePinAnnouncement = async (id: string) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, eventId: selectedEventId }),
      });
      if (res.ok) loadAnnouncements();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/announcements?id=${id}&eventId=${encodeURIComponent(selectedEventId)}`, {
        method: "DELETE",
      });
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
      const res = await fetch(`/api/discussions?id=${id}&eventId=${encodeURIComponent(selectedEventId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showFeedback("Message deleted.");
        loadDiscussions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Event Settings Modal
  const handleOpenEditSettings = () => {
    if (!currentEvent) return;
    setEditSettingsData({
      name: currentEvent.name || "",
      description: currentEvent.description || "",
      max_tens: currentEvent.max_tens || 5,
      leaderboard_visibility: currentEvent.leaderboard_visibility || (currentEvent.leaderboard_public ? "PUBLIC" : "HIDDEN"),
      discussion_enabled: currentEvent.discussion_enabled !== false,
      announcements_enabled: currentEvent.announcements_enabled !== false,
      allow_member_edits: currentEvent.allow_member_edits !== false,
      registration_start: currentEvent.registration_start ? currentEvent.registration_start.slice(0, 10) : "",
      registration_end: currentEvent.registration_end ? currentEvent.registration_end.slice(0, 10) : "",
      voting_start: currentEvent.voting_start ? currentEvent.voting_start.slice(0, 10) : "",
      voting_end: currentEvent.voting_end ? currentEvent.voting_end.slice(0, 10) : "",
    });
    setEditSettingsModalOpen(true);
  };

  // Save Event Settings
  const handleSaveEventSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !editSettingsData.name.trim()) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/events/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          ...editSettingsData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      showFeedback("Event configuration updated successfully.");
      setEditSettingsModalOpen(false);
      loadEventStatus(selectedEventId);
      loadEventsAndSession();
    } catch (err: any) {
      showFeedback(err.message || "Failed to save settings", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Deactivate Event Handler
  const handleDeactivateEvent = async () => {
    if (!selectedEventId) return;
    setIsDeactivating(true);
    try {
      const res = await fetch("/api/admin/events/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          reason: deactivateReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate event");

      showFeedback("Event has been deactivated. Normal participation is paused.");
      setDeactivateModalOpen(false);
      setDeactivateReason("");
      loadEventStatus(selectedEventId);
      loadEventsAndSession();
    } catch (err: any) {
      showFeedback(err.message || "Failed to deactivate event", "error");
    } finally {
      setIsDeactivating(false);
    }
  };

  // Reactivate Event Handler
  const handleReactivateEvent = async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch("/api/admin/events/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reactivate event");

      showFeedback("Event successfully reactivated to its active lifecycle stage.");
      loadEventStatus(selectedEventId);
      loadEventsAndSession();
    } catch (err: any) {
      showFeedback(err.message || "Failed to reactivate event", "error");
    }
  };

  // Reset Ballot Handler
  const handleResetBallotSubmit = async () => {
    if (!resetTargetTeam || !resetReason.trim()) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/admin/teams/${resetTargetTeam.teamId || resetTargetTeam.id}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: resetReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset ballot");

      showFeedback(`Ballot for ${resetTargetTeam.teamName || resetTargetTeam.name} reset and ratings cleared.`);
      setResetModalOpen(false);
      setResetTargetTeam(null);
      setResetReason("");
      loadVotingStatus();
      loadEventStatus(selectedEventId);
    } catch (err: any) {
      showFeedback(err.message || "Error resetting ballot", "error");
    } finally {
      setIsResetting(false);
    }
  };

  // Announcement edit starter
  const handleOpenEditAnnouncement = (ann: any) => {
    setEditingAnnouncement(ann);
    setNewTitle(ann.title);
    setNewContent(ann.content);
    setNewIsPinned(ann.is_pinned);
    setAnnouncementModalOpen(true);
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

  const currentEvent = eventData?.event;
  const currentStatus = currentEvent?.status || "DRAFT";
  const isArchived = currentStatus === "ARCHIVED";
  const nextAction = eventData?.nextAction;
  const statusDesc = eventData?.statusDescription;
  const stats = eventData?.stats;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        eventName={currentEvent?.name || "GWD Rating Platform"}
        eventStatus={currentStatus}
        userRole="admin"
        userLabel={session?.email || "Administrator"}
        eventsList={eventsList.map((e) => ({ id: e.id, name: e.name, status: e.status }))}
        selectedEventId={selectedEventId}
        onSelectEvent={(id) => {
          setSelectedEventId(id);
          setActiveTab("overview");
        }}
        onLogout={() => router.push("/login")}
      />

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`sticky top-16 z-30 px-4 py-2.5 text-center text-sm font-semibold transition-all shadow-xs ${
            feedbackMessage.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Multi-Event Control Header */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Where am I & What is happening */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#b80000]">
                  GWD Control Center
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  Event ID: {currentEvent?.id}
                </span>
                {isArchived && (
                  <span className="text-xs font-bold text-slate-700 bg-slate-200 border border-slate-300 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Completed & Archived (Read-Only)</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {currentEvent?.name || "Event Overview"}
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                {isArchived
                  ? "This event is completed and locked. All historical registrations, voting records, and leaderboard results are permanently preserved."
                  : statusDesc?.subtitle || "Manage event lifecycle, registrations, and voting."}
              </p>
            </div>

            {/* Top Primary Actions: Guided Next Action & "Create New Event" */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Prominent "Create New Event" Button */}
              <button
                onClick={() => {
                  setCreateStep(1);
                  setNewEventName("");
                  setNewEventDesc("");
                  setCreateEventModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
              >
                <Plus className="w-4 h-4 text-[#b80000]" />
                <span>Create New Event</span>
              </button>

              {/* Configure Settings Button */}
              {!isArchived && (
                <button
                  onClick={handleOpenEditSettings}
                  className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition-colors"
                  title="Configure event settings, dates, rules"
                >
                  <span>Edit Settings</span>
                </button>
              )}

              {/* Projector Display Link */}
              <Link
                href={`/projector?eventId=${encodeURIComponent(selectedEventId)}`}
                target="_blank"
                className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#b80000] bg-white hover:bg-slate-50 border border-slate-300 transition-colors"
                title="Open high-contrast projector leaderboard display"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Projector View</span>
              </Link>

              {/* Deactivate or Reactivate action */}
              {currentStatus === "DEACTIVATED" ? (
                <button
                  onClick={handleReactivateEvent}
                  className="px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors"
                >
                  Reactivate Event
                </button>
              ) : !isArchived ? (
                <button
                  onClick={() => {
                    setDeactivateReason("");
                    setDeactivateModalOpen(true);
                  }}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors"
                  title="Pause/Deactivate this event"
                >
                  Deactivate
                </button>
              ) : null}

              {/* Single Primary Action for Current State */}
              {!isArchived && currentStatus !== "DEACTIVATED" && nextAction?.nextStatus && (
                <button
                  onClick={() => setWorkflowModalOpen(true)}
                  className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] shadow-2xs transition-all group"
                >
                  <span>{nextAction.actionLabel}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {isArchived && (
                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] shadow-2xs transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Final Standings</span>
                </button>
              )}

              <button
                onClick={() => loadEventStatus(selectedEventId)}
                title="Refresh Status"
                className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* "What happens next?" Guidance Card */}
          <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-red-50/50 -mx-6 -mb-6 p-4 rounded-b-xl border-b border-red-100/50">
            <div className="text-xs sm:text-sm text-slate-700">
              <span className="font-bold text-[#b80000] mr-1.5">What happens next:</span>
              <span>
                {isArchived
                  ? "This event has officially concluded. You can review historical results or click 'Create New Event' to begin a fresh event."
                  : statusDesc?.whatHappensNext}
              </span>
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

        {/* Real Statistics for Selected Event */}
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
              Awaiting approval
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
              Participating in event
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

        {/* Clean Admin Navigation Tabs (Includes "Events") */}
        <div className="border-b border-slate-200 mb-6 bg-white rounded-t-xl px-2 shadow-2xs overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2 min-w-max py-2">
            {[
              { id: "overview", label: "Overview", icon: ShieldCheck },
              { id: "events", label: `Events Area (${eventsList.length})`, icon: Layers },
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

        {/* TAB: EVENTS AREA (Core Multi-Event Management) */}
        {activeTab === "events" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  All Platform Events ({eventsList.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Manage unlimited separate events over time. Each event maintains completely isolated teams, voting, and results.
                </p>
              </div>

              <button
                onClick={() => {
                  setCreateStep(1);
                  setNewEventName("");
                  setNewEventDesc("");
                  setCreateEventModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Event</span>
              </button>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventsList.map((ev) => {
                const isCurrent = ev.id === selectedEventId;
                const isEvArchived = ev.status === "ARCHIVED";

                return (
                  <div
                    key={ev.id}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? "bg-red-50/20 border-[#b80000] ring-1 ring-[#b80000] shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {ev.id}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                            {ev.name}
                          </h3>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${
                            ev.status === "REGISTRATION_OPEN"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : ev.status === "VOTING_OPEN"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : ev.status === "RESULTS_PUBLISHED"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : isEvArchived
                              ? "bg-slate-100 text-slate-700 border-slate-300"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {ev.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {ev.description}
                        </p>
                      )}

                      {/* Event Stats summary */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-center text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Teams</div>
                          <div className="font-bold text-slate-800">{ev.teamCount ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Approved</div>
                          <div className="font-bold text-emerald-700">{ev.approvedCount ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Ballots</div>
                          <div className="font-bold text-[#b80000]">{ev.submittedCount ?? 0}</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Created: {new Date(ev.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Quick actions for this event */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setActiveTab("overview");
                          showFeedback(`Switched to managing "${ev.name}"`);
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                          isCurrent
                            ? "bg-[#b80000] text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                        }`}
                      >
                        {isCurrent ? "Currently Active" : "Open / Manage"}
                      </button>

                      <button
                        onClick={() => {
                          setDuplicateSourceEvent(ev);
                          setDuplicateEventName(`${ev.name} (Copy)`);
                          setDuplicateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#b80000] hover:bg-slate-50 transition-colors"
                        title="Duplicate Settings to New Event"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Event Workflow Stepper */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Event Lifecycle Progress ({currentEvent?.name})
                </h2>
                {isArchived && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Archived
                  </span>
                )}
              </div>

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
                  const isCurrentStep = currentStatus === step.key;
                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isCurrentStep
                          ? "bg-red-50 border-[#b80000] ring-1 ring-[#b80000]"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-400">Step {idx + 1}</div>
                      <div
                        className={`text-xs font-bold mt-0.5 truncate ${
                          isCurrentStep ? "text-[#b80000]" : "text-slate-700"
                        }`}
                      >
                        {step.label}
                      </div>
                      {isCurrentStep && (
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
                  You have <span className="font-bold text-slate-900">{stats?.pendingReview ?? 0}</span> registrations waiting for review out of {stats?.teamsRegistered ?? 0} total for this event.
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
                  Leaderboard for {currentEvent?.name} is currently{" "}
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
                    disabled={isTogglingPublish || isArchived}
                    className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg text-white bg-[#b80000] hover:bg-[#990000] disabled:bg-slate-300 transition-colors"
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

        {/* TAB 2: REGISTRATIONS */}
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

            {registrations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No registrations found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {regSearch || regStatusFilter !== "ALL"
                    ? "No teams match your filter criteria. Try clearing search or status filter."
                    : `No teams have registered for "${currentEvent?.name}" yet.`}
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
                            disabled={isArchived}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-[#b80000] disabled:opacity-50 transition-colors"
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
                  Eligible teams for {currentEvent?.name}.
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
                  Approve team registrations from the Registrations tab to add them to this event.
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
                  Voting Monitor ({currentEvent?.name})
                </h2>
                <p className="text-xs text-slate-500">
                  Track dynamic rating progress and final ballot submissions for this event.
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

            {/* Voting Teams Table */}
            {votingTeams.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Vote className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No voting activity yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Approve at least 2 teams and advance {currentEvent?.name} to &quot;Voting Open&quot; to begin.
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
                      <th className="py-2.5 px-3">Submitted At</th>
                      <th className="py-2.5 px-3 text-right">Admin Unlock</th>
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
                          {vt.tensUsed} / {currentEvent?.max_tens || 5}
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
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {vt.submittedAt
                            ? new Date(vt.submittedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {vt.status === "SUBMITTED" && !isArchived && (
                              <button
                                onClick={() => {
                                  setUnlockTargetTeam(vt);
                                  setUnlockReason("");
                                  setUnlockModalOpen(true);
                                }}
                                className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors"
                                title="Unlock ballot so team can edit ratings"
                              >
                                Unlock
                              </button>
                            )}
                            {!isArchived && vt.ratedCount > 0 && (
                              <button
                                onClick={() => {
                                  setResetTargetTeam(vt);
                                  setResetReason("");
                                  setResetModalOpen(true);
                                }}
                                className="px-2 py-0.5 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
                                title="Reset all cast ratings and clear submitted ballot"
                              >
                                Reset
                              </button>
                            )}
                            {vt.status !== "SUBMITTED" && vt.ratedCount === 0 && (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </div>
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
                  {currentEvent?.name} Leaderboard
                </h2>
                <p className="text-xs text-slate-500">
                  Computed from this event&apos;s real finalized ratings only. Ranking rules: 1. Avg score, 2. Tens, 3. Nines.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {!isArchived && (
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
                )}
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
                  When teams submit ratings for {currentEvent?.name}, rankings will appear here automatically.
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
                <h2 className="text-base font-bold text-slate-900">
                  {currentEvent?.name} Announcements
                </h2>
                <p className="text-xs text-slate-500">
                  Notice board strictly for participants of this event.
                </p>
              </div>
              {!isArchived && (
                <button
                  onClick={() => setAnnouncementModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors"
                >
                  <span>Create Announcement</span>
                </button>
              )}
            </div>

            {announcements.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg">
                <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No announcements for this event yet</h3>
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
                      {!isArchived && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditAnnouncement(ann)}
                            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                            title="Edit announcement"
                          >
                            <Copy className="w-3.5 h-3.5 rotate-90" />
                          </button>
                          <button
                            onClick={() => handleTogglePinAnnouncement(ann.id)}
                            className="p-1 text-slate-400 hover:text-[#b80000] transition-colors"
                            title={ann.is_pinned ? "Unpin announcement" : "Pin announcement"}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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

        {/* TAB 7: DISCUSSION */}
        {activeTab === "discussion" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {currentEvent?.name} Discussion Moderation
                </h2>
                <p className="text-xs text-slate-500">
                  Review and moderate community messages from approved teams in this event.
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
                <h3 className="text-sm font-bold text-slate-900">No discussion messages in this event yet</h3>
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

                    {!isArchived && (
                      <button
                        onClick={() => handleDeleteDiscussion(msg.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        title="Moderate / Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: AUDIT LOG */}
        {activeTab === "audits" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {currentEvent?.name} Activity Log
                </h2>
                <p className="text-xs text-slate-500">
                  Audit trail of administrative state changes and team activities for this event.
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
                <h3 className="text-sm font-bold text-slate-900">No activity recorded for this event yet</h3>
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
            Event: <span className="text-slate-900 font-bold">{currentEvent?.name}</span>
          </p>
          <p className="mt-1">
            Transitioning: <span className="text-[#b80000]">{currentStatus.replace(/_/g, " ")}</span> &rarr;{" "}
            <span className="text-emerald-700 font-bold">{nextAction?.nextStatus?.replace(/_/g, " ")}</span>
          </p>
        </div>
      </Modal>

      {/* MODAL 2: 6-Step Setup Flow for Creating a New Event */}
      <Modal
        isOpen={createEventModalOpen}
        onClose={() => {
          if (!isCreatingEvent) setCreateEventModalOpen(false);
        }}
        title={`Create New Event (Step ${createStep} of 6)`}
        description="Set up an independent, fresh event with its own isolated teams and voting."
      >
        <div className="space-y-4 text-xs">
          {/* Stepper Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            {["Basics", "Registration", "Voting", "Leaderboard", "Review", "Confirm"].map((st, i) => (
              <span
                key={st}
                className={`text-[11px] font-bold ${
                  createStep === i + 1
                    ? "text-[#b80000] underline"
                    : createStep > i + 1
                    ? "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                {i + 1}. {st}
              </span>
            ))}
          </div>

          {/* Step 1: Basics */}
          {createStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Event Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Innovation Showcase 2026"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">Event Description</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the purpose, criteria, or theme..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Registration settings */}
          {createStep === 2 && (
            <div className="space-y-3">
              <p className="text-slate-600">Configure team registration parameters:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Registration Starts</label>
                  <input
                    type="date"
                    value={newRegStart}
                    onChange={(e) => setNewRegStart(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Registration Ends</label>
                  <input
                    type="date"
                    value={newRegEnd}
                    onChange={(e) => setNewRegEnd(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]">
                Teams will register with members and receive system-generated Team IDs. All registrations start in Pending review.
              </div>
            </div>
          )}

          {/* Step 3: Voting settings */}
          {createStep === 3 && (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Maximum 10-Point Ratings Allowed</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newMaxTens}
                  onChange={(e) => setNewMaxTens(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default is 5. Teams can award 10 to at most this many other teams. Ratings from 1-9 have no limit.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Voting Starts</label>
                  <input
                    type="date"
                    value={newVotingStart}
                    onChange={(e) => setNewVotingStart(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Voting Ends</label>
                  <input
                    type="date"
                    value={newVotingEnd}
                    onChange={(e) => setNewVotingEnd(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Leaderboard Visibility */}
          {createStep === 4 && (
            <div className="space-y-3">
              <label className="block font-bold text-slate-900 mb-1">Leaderboard Access Mode</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="lb_public"
                    checked={!newLeaderboardPublic}
                    onChange={() => setNewLeaderboardPublic(false)}
                    className="text-[#b80000]"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Restricted (Recommended)</div>
                    <div className="text-[11px] text-slate-500">Only administrators view live results until published.</div>
                  </div>
                </label>
                <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="lb_public"
                    checked={newLeaderboardPublic}
                    onChange={() => setNewLeaderboardPublic(true)}
                    className="text-[#b80000]"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Public Live Standings</div>
                    <div className="text-[11px] text-slate-500">Teams can see partial/live leaderboard as voting progresses.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 5: Review Configuration */}
          {createStep === 5 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-slate-900 pb-1 border-b border-slate-200">
                Configuration Summary:
              </div>
              <div className="flex justify-between">
                <span>Name:</span>
                <span className="font-bold text-slate-900">{newEventName || "Untitled"}</span>
              </div>
              <div className="flex justify-between">
                <span>Initial Status:</span>
                <span className="font-bold text-amber-700">DRAFT</span>
              </div>
              <div className="flex justify-between">
                <span>Max 10 Ratings:</span>
                <span className="font-bold">{newMaxTens}</span>
              </div>
              <div className="flex justify-between">
                <span>Leaderboard:</span>
                <span className="font-bold">{newLeaderboardPublic ? "Public" : "Restricted"}</span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Data Isolation: This event will start with 0 teams, 0 ratings, and clean isolated records.
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {createStep === 6 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-2 text-xs">
              <div className="font-bold text-sm">Ready to Create Event!</div>
              <p>
                Clicking &quot;Create Event&quot; will create <strong>{newEventName}</strong> in Draft status. You will be able to review it before opening registration.
              </p>
            </div>
          )}

          {/* Modal Step Navigation Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {createStep > 1 ? (
              <button
                type="button"
                onClick={() => setCreateStep((s) => s - 1)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            ) : <div />}

            {createStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (createStep === 1 && !newEventName.trim()) {
                    showFeedback("Please enter an event name.", "error");
                    return;
                  }
                  setCreateStep((s) => s + 1);
                }}
                className="px-4 py-1.5 bg-[#b80000] text-white rounded font-bold hover:bg-[#990000]"
              >
                Next &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateEventSubmit}
                disabled={isCreatingEvent}
                className="px-4 py-1.5 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800 disabled:opacity-50"
              >
                {isCreatingEvent ? "Creating..." : "Create Event"}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Duplicate Settings Modal */}
      <Modal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Duplicate Event Settings"
        description="Clone event configuration (rules, max 10s, settings) to a new Draft event without copying any historical teams or votes."
        confirmLabel="Create Duplicated Event"
        onConfirm={handleDuplicateSubmit}
        isLoading={isDuplicating}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">New Event Name</label>
            <input
              type="text"
              value={duplicateEventName}
              onChange={(e) => setDuplicateEventName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
            />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
            <span className="font-bold">Historical Data Protected:</span> Teams, registrations, ratings, votes, and messages from {duplicateSourceEvent?.name} will NOT be copied. The new event starts cleanly in Draft.
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Review Registration */}
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
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div>
                <span className="font-bold text-slate-900">Event:</span> {currentEvent?.name}
              </div>
              <div>
                <span className="font-bold text-slate-900">Team Name:</span> {selectedReg.name}
              </div>
              <div>
                <span className="font-bold text-slate-900">Leader:</span> {selectedReg.leaderName} ({selectedReg.leaderEmail})
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-900 mb-1.5">Decision:</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction("APPROVE")}
                  className={`py-2 text-xs font-bold rounded-lg border text-center ${
                    reviewAction === "APPROVE"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("REQUEST_CHANGES")}
                  className={`py-2 text-xs font-bold rounded-lg border text-center ${
                    reviewAction === "REQUEST_CHANGES"
                      ? "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("REJECT")}
                  className={`py-2 text-xs font-bold rounded-lg border text-center ${
                    reviewAction === "REJECT"
                      ? "bg-red-50 text-red-800 border-red-300 ring-1 ring-red-400"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Reject
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                {reviewAction === "REQUEST_CHANGES" ? "Requested Changes (Required):" : "Feedback Note (Optional):"}
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-xs"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 5: Unlock Ballot */}
      <Modal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        title={`Unlock Ballot: ${unlockTargetTeam?.teamName || unlockTargetTeam?.name || ""}`}
        description="Allow a team to update and re-submit their ratings. A formal reason is required."
        confirmLabel="Unlock Ballot"
        confirmVariant="danger"
        onConfirm={handleUnlockSubmit}
        isLoading={isUnlocking}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Reason for Unlocking *</label>
            <textarea
              rows={3}
              placeholder="e.g. Team reported an accidental submit before completing demo review..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
              required
            />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
            <span className="font-bold">Audit Notice:</span> This action will be logged in the permanent activity history with your administrator email, timestamp, and reason.
          </div>
        </div>
      </Modal>

      {/* MODAL 6: Create/Edit Announcement */}
      <Modal
        isOpen={announcementModalOpen}
        onClose={() => {
          setAnnouncementModalOpen(false);
          setEditingAnnouncement(null);
        }}
        title={editingAnnouncement ? `Edit Announcement (${currentEvent?.name})` : `Create Announcement (${currentEvent?.name})`}
        confirmLabel={editingAnnouncement ? "Update Announcement" : "Publish Announcement"}
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
              className="rounded text-[#b80000]"
            />
            <label htmlFor="pin_ann" className="text-xs font-semibold text-slate-800">
              Pin to top of announcements list
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL 7: Edit Event Settings */}
      <Modal
        isOpen={editSettingsModalOpen}
        onClose={() => setEditSettingsModalOpen(false)}
        title={`Configure Event: ${currentEvent?.name || ""}`}
        description="Update event parameters, dates, and feature visibility without creating a new event."
        confirmLabel="Save Settings"
        onConfirm={handleSaveEventSettings as any}
        isLoading={isSavingSettings}
      >
        <form onSubmit={handleSaveEventSettings} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Event Name *</label>
            <input
              type="text"
              required
              value={editSettingsData.name}
              onChange={(e) => setEditSettingsData({ ...editSettingsData, name: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Description</label>
            <textarea
              rows={2}
              value={editSettingsData.description}
              onChange={(e) => setEditSettingsData({ ...editSettingsData, description: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Max 10-Point Ratings Limit</label>
              <input
                type="number"
                min={1}
                max={20}
                value={editSettingsData.max_tens}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, max_tens: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Leaderboard Visibility</label>
              <select
                value={editSettingsData.leaderboard_visibility}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, leaderboard_visibility: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
              >
                <option value="PUBLIC">Public (Visible to everyone)</option>
                <option value="MEMBERS_ONLY">Members Only (Approved teams)</option>
                <option value="FINAL">Final Only (After publish)</option>
                <option value="HIDDEN">Hidden (Admins only)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Registration Start Date</label>
              <input
                type="date"
                value={editSettingsData.registration_start}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, registration_start: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Registration End Date</label>
              <input
                type="date"
                value={editSettingsData.registration_end}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, registration_end: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Voting Start Date</label>
              <input
                type="date"
                value={editSettingsData.voting_start}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, voting_start: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Voting End Date</label>
              <input
                type="date"
                value={editSettingsData.voting_end}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, voting_end: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editSettingsData.discussion_enabled}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, discussion_enabled: e.target.checked })}
                className="rounded text-[#b80000]"
              />
              <span className="font-semibold text-slate-800">Enable Team Discussion Board</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editSettingsData.allow_member_edits}
                onChange={(e) => setEditSettingsData({ ...editSettingsData, allow_member_edits: e.target.checked })}
                className="rounded text-[#b80000]"
              />
              <span className="font-semibold text-slate-800">Allow Team Leaders to manage roster members</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL 8: Deactivate Event Confirmation */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title={`Deactivate Event: ${currentEvent?.name || ""}`}
        description="Deactivating this event will temporarily suspend normal team registration, voting, and participant actions. All data and records remain completely safe."
        confirmLabel="Deactivate Event"
        confirmVariant="danger"
        onConfirm={handleDeactivateEvent}
        isLoading={isDeactivating}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Reason for Deactivation (Optional):</label>
            <textarea
              rows={3}
              placeholder="e.g. Temporary event pause for scheduling adjustments..."
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
            />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
            <span className="font-bold">Reactivation Available:</span> You can safely reactivate this event at any time from this dashboard to resume from where it was paused.
          </div>
        </div>
      </Modal>

      {/* MODAL 9: Reset Ballot Confirmation */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Ballot: ${resetTargetTeam?.teamName || resetTargetTeam?.name || ""}`}
        description="Clear all 1–10 peer ratings cast by this team and unlock their ballot. A formal reason is required."
        confirmLabel="Reset Ballot"
        confirmVariant="danger"
        onConfirm={handleResetBallotSubmit}
        isLoading={isResetting}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Reason for Reset *</label>
            <textarea
              rows={3}
              placeholder="e.g. Team leader requested reset due to evaluating wrong projects..."
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#b80000]"
              required
            />
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-[11px]">
            <span className="font-bold">Warning:</span> This will permanently erase the draft or submitted scores cast by this team. The action will be logged in the permanent audit trail.
          </div>
        </div>
      </Modal>
    </div>
  );
}
