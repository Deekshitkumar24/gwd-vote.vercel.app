import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "team" || !session.teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentTeam = Database.getTeamById(session.teamId);
    if (!currentTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const eventId = currentTeam.event_id;
    const ratings = Database.getRatingsByRater(eventId, currentTeam.id);
    const ratingsMap: Record<string, number> = {};
    for (const r of ratings) {
      ratingsMap[r.target_team_id] = r.score;
    }

    return NextResponse.json({
      eventId,
      ratings: ratingsMap,
      submittedAt: currentTeam.submitted_at,
      isSubmitted: currentTeam.submitted_at !== null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load ratings" }, { status: 500 });
  }
}
