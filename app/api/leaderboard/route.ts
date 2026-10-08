import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";
import { computeLeaderboard } from "@/lib/rules";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    const isAdmin = session?.role === "admin";

    const event = Database.getEvent();
    const isPubliclyAllowed =
      event.leaderboard_public ||
      event.status === "RESULTS_PUBLISHED" ||
      event.status === "VOTING_OPEN";

    if (!isAdmin && !isPubliclyAllowed) {
      return NextResponse.json({
        isVisible: false,
        status: event.status,
        message: "The leaderboard is not currently published.",
        leaderboard: [],
      });
    }

    const approvedTeams = Database.getApprovedTeams().map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
    }));

    const allRatings = Database.getAllRatings().map((r) => ({
      targetTeamId: r.target_team_id,
      score: r.score,
    }));

    const leaderboard = computeLeaderboard(approvedTeams, allRatings);

    const isFinal = event.status === "RESULTS_PUBLISHED" || event.status === "ARCHIVED";

    return NextResponse.json({
      isVisible: true,
      isFinal,
      status: event.status,
      leaderboardPublic: event.leaderboard_public,
      leaderboard,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate leaderboard" }, { status: 500 });
  }
}
