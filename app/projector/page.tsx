"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, RefreshCw, Maximize, Minimize, Layers, ArrowLeft } from "lucide-react";

interface LeaderboardItem {
  rank: number;
  teamId: string;
  teamCode: string;
  teamName: string;
  avgScore: number;
  ratingsReceived: number;
  tensReceived: number;
}

interface PublicEvent {
  id: string;
  name: string;
  status: string;
}

function ProjectorContent() {
  const searchParams = useSearchParams();
  const queryEventId = searchParams.get("eventId");

  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [isFinal, setIsFinal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Fetch events list
  useEffect(() => {
    fetch("/api/events/public")
      .then((res) => res.json())
      .then((data) => {
        const list: PublicEvent[] = data.events || [];
        setEvents(list);
        const defaultId = queryEventId || data.activeEventId || (list[0]?.id ?? "");
        setSelectedEventId(defaultId);
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, [queryEventId]);

  // 2. Fetch leaderboard data for selected event
  const fetchLeaderboard = (evId: string) => {
    if (!evId) return;
    Promise.all([
      fetch(`/api/leaderboard?eventId=${encodeURIComponent(evId)}`).then((r) => r.json()),
      fetch(`/api/event/status?eventId=${encodeURIComponent(evId)}`).then((r) => r.json()),
    ])
      .then(([lbData, stData]) => {
        setEventDetails(stData.event);
        setIsFinal(lbData.isFinal || stData.event?.status === "RESULTS_PUBLISHED" || stData.event?.status === "ARCHIVED");
        setLeaderboard(lbData.leaderboard || []);
        setLastRefreshed(new Date().toLocaleTimeString());
      })
      .catch((e) => console.error(e));
  };

  useEffect(() => {
    if (!selectedEventId) return;
    fetchLeaderboard(selectedEventId);
  }, [selectedEventId]);

  // Auto-refresh interval (every 8 seconds)
  useEffect(() => {
    if (!autoRefresh || !selectedEventId) return;
    const interval = setInterval(() => {
      fetchLeaderboard(selectedEventId);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedEventId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between selection:bg-[#b80000] selection:text-white">
      {/* Top Banner / Display Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="relative w-12 h-12 bg-white rounded-lg p-1.5 shrink-0 shadow-sm hover:opacity-90 transition-opacity">
            <Image src="/gwd.png" alt="GWD" fill className="object-contain p-1" priority />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                {eventDetails?.name || "Official Event Leaderboard"}
              </h1>
              {isFinal ? (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black tracking-widest uppercase flex items-center space-x-1.5 animate-pulse">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>FINAL STANDINGS</span>
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/40 rounded-full text-xs font-black tracking-widest uppercase flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>LIVE RESULTS</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">
              Projector Display Mode • High-Resolution Live Results Screen
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {events.length > 1 && (
            <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold outline-none cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchLeaderboard(selectedEventId)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
              autoRefresh
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/50"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-colors flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit</span>
          </Link>
        </div>
      </header>

      {/* Main Leaderboard Table */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-start">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#b80000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-300">No Finalized Ratings Yet</h2>
            <p className="text-sm text-slate-500 max-w-md">
              Standings will automatically calculate and appear here in real-time as participating teams submit their verified ballots.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-extrabold">
                  <th className="py-4 px-6 text-center w-24">Rank</th>
                  <th className="py-4 px-6 w-32">Team ID</th>
                  <th className="py-4 px-6">Team Name</th>
                  <th className="py-4 px-6 text-right w-44">Avg Rating</th>
                  <th className="py-4 px-6 text-center w-36">Ratings Cast</th>
                  <th className="py-4 px-6 text-center w-36">10s Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {leaderboard.map((item, index) => {
                  const isTop3 = index < 3;
                  const medalColor =
                    index === 0
                      ? "bg-amber-500 text-slate-950 ring-4 ring-amber-500/20"
                      : index === 1
                      ? "bg-slate-300 text-slate-950 ring-4 ring-slate-300/20"
                      : index === 2
                      ? "bg-amber-700 text-white ring-4 ring-amber-700/20"
                      : "bg-slate-800 text-slate-400";

                  return (
                    <tr
                      key={item.teamId}
                      className={`transition-colors ${
                        index === 0
                          ? "bg-amber-500/10 hover:bg-amber-500/15"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-4 px-6 text-center">
                        <div
                          className={`w-9 h-9 mx-auto rounded-full font-black text-base flex items-center justify-center ${medalColor}`}
                        >
                          {item.rank}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-bold text-sm">
                        {item.teamCode}
                      </td>
                      <td className="py-4 px-6 font-sans font-bold text-lg text-white">
                        {item.teamName}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-2xl text-emerald-400">
                        {item.avgScore > 0 ? item.avgScore.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-4 px-6 text-center text-slate-300 font-semibold text-base">
                        {item.ratingsReceived}
                      </td>
                      <td className="py-4 px-6 text-center font-black text-lg text-amber-400">
                        {item.tensReceived}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span>GWD Projector Presentation View</span>
          <span>•</span>
          <span>Last synchronized: {lastRefreshed || "Just now"}</span>
        </div>
        <div className="font-medium text-slate-400">
          Ranked by: 1) Average Score, 2) Total 10-Point Ratings, 3) Total 9-Point Ratings
        </div>
      </footer>
    </div>
  );
}

export default function ProjectorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#b80000] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProjectorContent />
    </Suspense>
  );
}
