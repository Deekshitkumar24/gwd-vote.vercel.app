"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface MemberInput {
  name: string;
  role: string;
  email: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [eventStatus, setEventStatus] = useState<string | null>(null);
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
  } | null>(null);

  useEffect(() => {
    fetch("/api/event/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.event) {
          setEventStatus(data.event.status);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsStatusLoading(false));
  }, []);

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

      setRegisteredTeam(data.team);
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

  // Registration closed notice
  if (eventStatus && eventStatus !== "REGISTRATION_OPEN") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto w-full bg-white p-8 border border-slate-200 rounded-xl shadow-xs text-center">
          <div className="relative w-14 h-14 mx-auto mb-4 bg-white border border-slate-200 rounded-lg p-2">
            <Image src="/gwd.png" alt="GWD Logo" fill className="object-contain p-1" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Registration is Closed</h2>
          <p className="mt-2 text-sm text-slate-600">
            Team registration is not currently open for this event. Current stage:{" "}
            <span className="font-semibold text-slate-800">{eventStatus.replace(/_/g, " ")}</span>.
          </p>
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
            Your team has been successfully registered and is pending organizer approval.
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
            Fill in your team details to join the GWD Event showcase and rating platform.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-sm text-red-700 animate-in fade-in">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#b80000]" />
            <div>
              <p className="font-semibold">Unable to register</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
          {/* Section 1: Team & Leader Basics */}
          <div>
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              1. Team Information
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Innovators"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#b80000] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Team Leader Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#b80000] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Leader Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={leaderEmail}
                  onChange={(e) => setLeaderEmail(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#b80000] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contact / Phone
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#b80000] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Create Team Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#b80000] focus:border-transparent outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Brief Project / Team Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what your team is building or showcasing..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#b80000] focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Team Members */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                2. Additional Team Members ({members.length})
              </h2>
              <button
                type="button"
                onClick={addMemberRow}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-[#b80000] hover:text-[#990000] bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>

            {members.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 italic">
                Team leader is automatically included as member #1. Click &quot;Add Member&quot; above to add more teammates.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <input
                      type="text"
                      placeholder={`Member ${idx + 2} Name`}
                      value={m.name}
                      onChange={(e) => updateMemberRow(idx, "name", e.target.value)}
                      className="w-full sm:flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#b80000] outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. Frontend, Designer)"
                      value={m.role}
                      onChange={(e) => updateMemberRow(idx, "role", e.target.value)}
                      className="w-full sm:w-44 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#b80000] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeMemberRow(idx)}
                      className="self-end sm:self-auto text-slate-400 hover:text-red-600 p-1.5 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission notice */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Note:</span> Your unique Team ID (e.g. GWD-101) will be assigned automatically upon submission.
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Already registered? Sign in
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 py-2.5 px-6 text-sm font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
