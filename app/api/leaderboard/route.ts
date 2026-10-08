import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";
import { computeLeaderboard } from "@/lib/rules";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    const isAdmin = session?.role === "admin";
    const { searchParams } = new URL(req.url);

    const eventId =
      searchParams.get("eventId") ||
      (session?.role === "team" ? session.eventId : null) ||
      Database.getActiveEventId();

    const event = Database.getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const isPubliclyAllowed =
      event.leaderboard_public ||
      event.status === "RESULTS_PUBLISHED" ||
      event.status === "ARCHIVED" ||
      event.status === "VOTING_OPEN";

    if (!isAdmin && !isPubliclyAllowed) {
      return NextResponse.json({
        eventId: event.id,
        eventName: event.name,
        isVisible: false,
        status: event.status,
        message: "The leaderboard is not currently published for this event.",
        leaderboard: [],
      });
    }

    // Filter strictly by this event
    const approvedTeams = Database.getApprovedTeams(event.id).map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
    }));

    const allRatings = Database.getAllRatings(event.id).map((r) => ({
      targetTeamId: r.target_team_id,
      score: r.score,
    }));

    const leaderboard = computeLeaderboard(approvedTeams, allRatings);
    const isFinal = event.status === "RESULTS_PUBLISHED" || event.status === "ARCHIVED";

    return NextResponse.json({
      eventId: event.id,
      eventName: event.name,
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
