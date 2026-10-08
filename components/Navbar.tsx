"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, User, ShieldCheck } from "lucide-react";

interface NavbarProps {
  eventName?: string;
  eventStatus?: string;
  userRole?: "admin" | "team" | null;
  userLabel?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  eventName = "GWD Team Hackathon & Showcase",
  eventStatus,
  userRole,
  userLabel,
  onLogout,
}) => {
  const router = useRouter();

  const handleLogoutClick = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (onLogout) {
        onLogout();
      } else {
        router.push("/login");
      }
    } catch (e) {
      console.error(e);
      router.push("/login");
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "REGISTRATION_OPEN":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "VOTING_OPEN":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "RESULTS_PUBLISHED":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "VOTING_READY":
      case "REGISTRATION_CLOSED":
      case "VOTING_CLOSED":
      case "RESULTS_READY":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatStatus = (status?: string) => {
    if (!status) return "";
    return status.replace(/_/g, " ");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Event Name */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 bg-white border border-slate-200 rounded-md p-1 shadow-2xs group-hover:border-[#b80000] transition-colors">
                <Image
                  src="/gwd.png"
                  alt="GWD Official Logo"
                  fill
                  className="object-contain p-0.5"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-[#b80000] transition-colors">
                  {eventName}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Pre-Deployment Team Rating Platform
                </span>
              </div>
            </Link>

            {eventStatus && (
              <span
                className={`hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
                  eventStatus
                )}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                {formatStatus(eventStatus)}
              </span>
            )}
          </div>

          {/* Right actions: User context & Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {userRole ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800">
                  {userRole === "admin" ? (
                    <ShieldCheck className="w-4 h-4 text-[#b80000]" />
                  ) : (
                    <User className="w-4 h-4 text-[#b80000]" />
                  )}
                  <span className="max-w-[120px] sm:max-w-[180px] truncate">
                    {userLabel || (userRole === "admin" ? "Administrator" : "Team Member")}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      userRole === "admin"
                        ? "bg-[#b80000] text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {userRole}
                  </span>
                </div>

                <button
                  onClick={handleLogoutClick}
                  className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-[#b80000] hover:bg-red-50 border border-slate-200 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Sign out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-[#b80000] hover:bg-slate-50 rounded-lg border border-transparent transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#b80000] hover:bg-[#990000] rounded-lg shadow-2xs transition-colors"
                >
                  Register Team
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
