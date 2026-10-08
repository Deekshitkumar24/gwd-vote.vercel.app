"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, CheckCircle2, AlertCircle, ArrowRight, Calendar, Layers } from "lucide-react";

interface MemberInput {
  name: string;
  role: string;
  email: string;
}

interface EventSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  isActive: boolean;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEventId = searchParams.get("eventId");

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [currentEvent, setCurrentEvent] = useState<EventSummary | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [members, setMembers] = useState<MemberInput[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState<{
    code: string;
    name: string;
    leaderName: string;
    eventName?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/events/public")
      .then((res) => res.json())
      .then((data) => {
        const evList: EventSummary[] = data.events || [];
        setEvents(evList);

        // Determine default event: query param > open registration event > active event > first event
        let chosen = queryEventId ? evList.find((e) => e.id === queryEventId) : null;
        if (!chosen) {
          chosen = evList.find((e) => e.status === "REGISTRATION_OPEN") ||
                   evList.find((e) => e.id === data.activeEventId) ||
                   evList[0] ||
                   null;
        }

        if (chosen) {
          setSelectedEventId(chosen.id);
          setCurrentEvent(chosen);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsStatusLoading(false));
  }, [queryEventId]);

  const handleEventChange = (evId: string) => {
    setSelectedEventId(evId);
    const ev = events.find((e) => e.id === evId) || null;
    setCurrentEvent(ev);
  };

  const addMemberRow = () => {
    setMembers([...members, { name: "", role: "Member", email: "" }]);
  };

  const updateMemberRow = (index: number, field: keyof MemberInput, val: string) => {
    const updated = [...members];
    updated[index][field] = val;
    setMembers(updated);
  };

  const removeMemberRow = (index: number) => {
    setMembers(members.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/teams/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          name: teamName,
          leader_name: leaderName,
          leader_email: leaderEmail,
          contact,
          description,
          password,
          members: members.filter((m) => m.name.trim().length > 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setRegisteredTeam({
        code: data.team.code,
        name: data.team.name,
        leaderName: data.team.leader_name,
        eventName: currentEvent?.name,
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isStatusLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#b80000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Registration closed notice if the selected event is not in REGISTRATION_OPEN
  if (currentEvent && currentEvent.status !== "REGISTRATION_OPEN") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto w-full bg-white p-8 border border-slate-200 rounded-xl shadow-xs text-center">
          <div className="relative w-14 h-14 mx-auto mb-4 bg-white border border-slate-200 rounded-lg p-2">
            <Image src="/gwd.png" alt="GWD Logo" fill className="object-contain p-1" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Registration is Closed</h2>
          <p className="mt-2 text-sm text-slate-600">
            Registration is not currently open for{" "}
            <span className="font-semibold text-slate-800">{currentEvent.name}</span>. Current stage:{" "}
            <span className="font-semibold text-slate-800">{currentEvent.status.replace(/_/g, " ")}</span>.
          </p>

          {events.length > 1 && (
            <div className="mt-4 text-left border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Another Event:</label>
              <select
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg bg-white"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-6 flex flex-col space-y-2">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg transition-colors"
            >
              Sign In to Your Team Account
            </Link>
            <Link
              href="/"
              className="w-full py-2 px-4 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration Success view
  if (registeredTeam) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto w-full bg-white p-8 border border-slate-200 rounded-xl shadow-sm text-center animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Registration Submitted!</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your team has been successfully registered for{" "}
            <span className="font-semibold text-slate-800">{registeredTeam.eventName || "the event"}</span> and is pending organizer approval.
          </p>

          {/* Generated Team ID Card */}
          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-left">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Team ID (System-Generated)
            </div>
            <div className="text-2xl font-extrabold text-[#b80000] mt-1 font-mono tracking-wide">
              {registeredTeam.code}
            </div>
            <div className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">Team Name:</span> {registeredTeam.name}
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-semibold">Team Leader:</span> {registeredTeam.leaderName}
            </div>
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              Please save your Team ID <span className="font-bold">{registeredTeam.code}</span>. You can sign in using this Team ID and your password.
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="block text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Back to Event Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3 mb-3">
            <div className="relative w-12 h-12 bg-white border border-slate-200 rounded-lg p-2 shadow-2xs">
              <Image src="/gwd.png" alt="GWD Logo" fill className="object-contain p-1" priority />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Register Your Team
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter team details and member roster to join the event evaluation.
          </p>
        </div>

        {/* Event Selection Banner */}
        {events.length > 0 && (
          <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Layers className="w-5 h-5 text-[#b80000]" />
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Event</div>
                <div className="text-sm font-bold text-slate-900">{currentEvent?.name || "Selected Event"}</div>
              </div>
            </div>
            {events.length > 1 && (
              <select
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="text-xs py-1.5 px-3 border border-slate-300 rounded-md bg-slate-50 font-medium text-slate-800"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3 text-sm text-[#b80000]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. Team Information
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Team Name *
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., CodeCrafters Alpha"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b80000]/20 focus:border-[#b80000]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Project / Team Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of your application or team project..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b80000]/20 focus:border-[#b80000]"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. Team Leader & Login Credentials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Leader Name *
                </label>
                <input
                  type="text"
                  required
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b80000]/20 focus:border-[#b80000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Leader Email *
                </label>
                <input
                  type="email"
                  required
                  value={leaderEmail}
                  onChange={(e) => setLeaderEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b80000]/20 focus:border-[#b80000]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b80000]/20 focus:border-[#b80000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Team Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b80000]/20 focus:border-[#b80000]"
                />
              </div>
            </div>
          </div>

          {/* Members Roster */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900">
                3. Team Members (Optional)
              </h2>
              <button
                type="button"
                onClick={addMemberRow}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#b80000] hover:text-[#990000] px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No additional members added yet. Click &quot;Add Member&quot; if you want to record other teammates.
              </p>
            ) : (
              <div className="space-y-3">
                {members.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Member Name"
                      value={m.name}
                      onChange={(e) => updateMemberRow(idx, "name", e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#b80000]"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. Frontend)"
                      value={m.role}
                      onChange={(e) => updateMemberRow(idx, "role", e.target.value)}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#b80000]"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={m.email}
                      onChange={(e) => updateMemberRow(idx, "email", e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#b80000]"
                    />
                    <button
                      type="button"
                      onClick={() => removeMemberRow(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 font-bold text-white bg-[#b80000] hover:bg-[#990000] disabled:bg-slate-300 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <span>Submit Team Registration</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[#b80000] hover:underline">
            Sign In with your Team ID
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#b80000] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
