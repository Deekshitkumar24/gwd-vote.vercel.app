"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Users, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"team" | "admin">("team");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload =
        activeTab === "admin"
          ? { role: "admin", email: email.trim(), password }
          : { role: "team", code: identifier.trim(), password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (activeTab === "admin") {
        router.push("/admin");
      } else {
        router.push("/team");
      }
    } catch (err: any) {
      setError(err.message || "Unable to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-3 mb-4">
          <div className="relative w-14 h-14 bg-white border border-slate-200 rounded-lg p-2 shadow-xs">
            <Image
              src="/gwd.png"
              alt="GWD Official Logo"
              fill
              className="object-contain p-1"
              priority
            />
          </div>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign In to GWD Event Platform
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your team credentials or sign in as an administrator
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {/* Role Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("team");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-semibold rounded-md transition-all ${
                activeTab === "team"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4 text-[#b80000]" />
              <span>Team Member</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-semibold rounded-md transition-all ${
                activeTab === "admin"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#b80000]" />
              <span>Administrator</span>
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-sm text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#b80000]" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === "team" ? (
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Team ID or Registered Email
                </label>
                <div className="mt-1">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    placeholder="e.g. GWD-101 or leader@domain.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b80000] focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Your Team ID was generated during registration (e.g. GWD-101).
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Administrator Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="admin@gwd.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b80000] focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Default credentials: <span className="font-mono text-slate-700 font-semibold">admin@gwd.com</span>
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Password
                </label>
                {activeTab === "admin" && (
                  <span className="text-xs text-slate-500 font-mono">
                    Default: <span className="font-semibold text-slate-700">admin1234</span>
                  </span>
                )}
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b80000] focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {activeTab === "team" && (
            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-xs text-slate-600">
                Not registered yet?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#b80000] hover:underline"
                >
                  Register your team here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
