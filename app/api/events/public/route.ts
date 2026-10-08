import { NextResponse } from "next/server";
import { Database } from "@/lib/db";

export async function GET() {
  try {
    await Database.ensureSynced();
    const events = Database.getAllEvents();
    const activeEventId = Database.getActiveEventId();

    const publicList = events.map((ev) => {
      const teams = Database.getAllTeams(ev.id);
      const approved = teams.filter((t) => t.status === "APPROVED");
      return {
        id: ev.id,
        name: ev.name,
        description: ev.description || "",
        status: ev.status,
        leaderboard_public: ev.leaderboard_public,
        registration_start: ev.registration_start,
        registration_end: ev.registration_end,
        voting_start: ev.voting_start,
        voting_end: ev.voting_end,
        isActive: ev.id === activeEventId,
        teamCount: teams.length,
        approvedCount: approved.length,
      };
    });

    return NextResponse.json({
      activeEventId,
      events: publicList,
    });
  } catch (error: any) {
    console.error("Public events error:", error);
    return NextResponse.json({ error: error.message || "Failed to load events" }, { status: 500 });
  }
}
