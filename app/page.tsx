"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  Vote,
  Trophy,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Bell,
  Clock,
  Sparkles,
  ChevronRight,
  Archive,
  Layers,
  History,
} from "lucide-react";

interface PublicEvent {
  id: string;
  name: string;
  description: string;
  status: string;
  leaderboard_public: boolean;
  isActive: boolean;
  teamCount: number;
  approvedCount: number;
}

export default function HomePage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventData, setEventData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial load: fetch public events list
  useEffect(() => {
    fetch("/api/events/public")
      .then((res) => res.json())
      .then((data) => {
        const evList: PublicEvent[] = data.events || [];
        setEvents(evList);

        const defaultId =
          data.activeEventId || (evList.length > 0 ? evList[0].id : "");
        setSelectedEventId(defaultId);
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  // When selected event changes, load its details
  useEffect(() => {
    if (!selectedEventId) return;

    Promise.all([
      fetch(`/api/event/status?eventId=${encodeURIComponent(selectedEventId)}`).then((r) =>
        r.json()
      ),
      fetch(`/api/announcements?eventId=${encodeURIComponent(selectedEventId)}`).then((r) =>
        r.json()
      ),
      fetch(`/api/leaderboard?eventId=${encodeURIComponent(selectedEventId)}`).then((r) =>
        r.json()
      ),
    ])
      .then(([eData, aData, lData]) => {
        setEventData(eData);
        setAnnouncements(aData.announcements || []);
        if (lData.isVisible) {
          setLeaderboard(lData.leaderboard || []);
        } else {
          setLeaderboard([]);
        }
      })
      .catch((e) => console.error(e));
  }, [selectedEventId]);

  const currentStatus = eventData?.event?.status || "DRAFT";
  const statusDesc = eventData?.statusDescription;
  const isRegistrationOpen = currentStatus === "REGISTRATION_OPEN";
  const isVotingOpen = currentStatus === "VOTING_OPEN";
  const isPublished = currentStatus === "RESULTS_PUBLISHED";
  const isArchived = currentStatus === "ARCHIVED";

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative w-11 h-11 bg-white border border-slate-200 rounded-md p-1 shadow-2xs">
              <Image
                src="/gwd.png"
                alt="GWD Official Logo"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 tracking-tight">
                {eventData?.event?.name || "GWD Team Rating Platform"}
              </div>
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                Multi-Event Evaluation & Transparent Peer Voting
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {events.length > 1 && (
              <div className="hidden md:flex items-center space-x-1.5 border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 text-xs">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} {ev.status === "ARCHIVED" ? "(Archived)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#b80000] transition-colors"
            >
              Sign In
            </Link>
            {isRegistrationOpen && (
              <Link
                href={`/register?eventId=${encodeURIComponent(selectedEventId)}`}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors"
              >
                Register Team
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-[#b80000] border border-red-200">
            <span className="w-2 h-2 rounded-full bg-[#b80000] animate-pulse" />
            <span>Official Multi-Event Rating Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Team Showcase & Peer Rating Platform
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A reusable, high-transparency platform conducting independent team events over time. Complete lifecycle isolation, live ratings, and verifiable leaderboard results.
          </p>

          {/* Prominent Current Event Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left max-w-xl mx-auto shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                {isArchived ? "Archived Event Record" : "What is happening right now?"}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isRegistrationOpen
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : isVotingOpen
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : isPublished
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : isArchived
                    ? "bg-slate-100 text-slate-700 border-slate-300"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {currentStatus.replace(/_/g, " ")}
              </span>
            </div>

            <div>
              <div className="text-lg font-bold text-slate-900">
                {eventData?.event?.name || "Selected Event"}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {statusDesc?.subtitle || "Event operations and ratings."}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row gap-2">
              {isRegistrationOpen && (
                <Link
                  href={`/register?eventId=${encodeURIComponent(selectedEventId)}`}
                  className="flex-1 inline-flex items-center justify-center space-x-2 py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors"
                >
                  <span>Register Your Team</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                href="/login"
                className="flex-1 inline-flex items-center justify-center space-x-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <span>Team & Administrator Sign In</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Multi-Event Historical & Active Events Switcher Section */}
        {events.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <History className="w-4 h-4 text-[#b80000]" />
                  <span>Platform Events</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Switch between active and archived events to view historical records, teams, and standings.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {events.length} Event{events.length !== 1 ? "s" : ""} Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {events.map((ev) => {
                const isSelected = ev.id === selectedEventId;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-[#b80000] bg-red-50/30 ring-1 ring-[#b80000]"
                        : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {ev.status.replace(/_/g, " ")}
                      </span>
                      {ev.isActive && (
                        <span className="text-[10px] font-bold bg-[#b80000] text-white px-2 py-0.5 rounded-full">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate">{ev.name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                      <span>{ev.teamCount} Teams Registered</span>
                      {isSelected ? (
                        <span className="text-[#b80000] font-bold text-[11px]">Viewing &rarr;</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Click to view</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 3 Core Questions Section: Where am I? What is happening? What do I need to do next? */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#b80000] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#b80000]" />
              <span>1. Where am I?</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              {eventData?.event?.name || "Official Event Portal"}
            </div>
            <p className="text-xs text-slate-600">
              You are on the official rating portal. All registrations, ratings, discussions, and leaderboards belong exclusively to this event.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#b80000] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#b80000]" />
              <span>2. What is happening?</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              Stage: {currentStatus.replace(/_/g, " ")}
            </div>
            <p className="text-xs text-slate-600">
              {statusDesc?.subtitle || "Current event status is in progress."}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#b80000] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#b80000]" />
              <span>3. What do I do next?</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              {isRegistrationOpen
                ? "Register your team now"
                : isVotingOpen
                ? "Sign in to cast peer ratings"
                : isPublished
                ? "Review final leaderboard"
                : "Awaiting next phase"}
            </div>
            <p className="text-xs text-slate-600">
              {isRegistrationOpen
                ? "Submit your team roster and project details before registration closes."
                : isVotingOpen
                ? "Every eligible team must score all peers on a 1–10 scale."
                : isPublished
                ? "Official results and rankings have been calculated and verified."
                : "Sign in to check announcements or wait for organizers to start the next phase."}
            </p>
          </div>
        </section>

        {/* Leaderboard Section */}
        {leaderboard.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>{isPublished || isArchived ? "Official Final Leaderboard" : "Live Event Standings"}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Calculated by highest average score, 10-point ratings, and 9-point ratings for {eventData?.event?.name}.
                </p>
              </div>
              <Link
                href="/login"
                className="text-xs font-semibold text-[#b80000] hover:underline"
              >
                Sign in to view details &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <th className="py-2.5 px-3 text-center">Rank</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3 text-right">Avg Rating</th>
                    <th className="py-2.5 px-3 text-center">Ratings</th>
                    <th className="py-2.5 px-3 text-center">10s</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {leaderboard.slice(0, 10).map((item) => (
                    <tr key={item.teamId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-center font-bold">{item.rank}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <span className="font-mono text-slate-500 mr-2">{item.teamCode}</span>
                        {item.teamName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 text-sm">
                        {item.avgScore > 0 ? item.avgScore.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {item.ratingsReceived}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {item.tensReceived}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Official Announcements Preview */}
        {announcements.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Bell className="w-4 h-4 text-[#b80000]" />
              <span>Official Event Announcements ({eventData?.event?.name})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {announcements.slice(0, 4).map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">{ann.title}</h3>
                    {ann.is_pinned && (
                      <span className="text-[10px] font-bold text-[#b80000] bg-red-100 px-1.5 py-0.2 rounded">
                        PINNED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                  <div className="text-[10px] text-slate-400">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Clean Footer with Official Logo */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="relative w-6 h-6">
              <Image src="/gwd.png" alt="GWD" fill className="object-contain" />
            </div>
            <span className="font-semibold text-slate-700">GWD Team Rating Platform</span>
            <span>—</span>
            <span>Get Work Done</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/login" className="hover:text-[#b80000]">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-[#b80000]">
              Register Team
            </Link>
            <Link href="/login" className="text-slate-400 hover:text-slate-600">
              Admin Access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
