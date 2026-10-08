import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "team" || !session.teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentTeam = Database.getTeamById(session.teamId);
    if (!currentTeam || currentTeam.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved teams can rate." }, { status: 403 });
    }

    if (currentTeam.submitted_at !== null) {
      return NextResponse.json({ error: "Your ballot is already submitted and locked." }, { status: 403 });
    }

    const event = Database.getEvent();
    if (event.status !== "VOTING_OPEN") {
      return NextResponse.json({ error: "Voting is not currently open." }, { status: 403 });
    }

    const body = await req.json();
    const { targetTeamId, score } = body;

    if (!targetTeamId) {
      return NextResponse.json({ error: "Target team is required." }, { status: 400 });
    }

    if (targetTeamId === currentTeam.id) {
      return NextResponse.json({ error: "A team cannot rate itself." }, { status: 400 });
    }

    const targetTeam = Database.getTeamById(targetTeamId);
    if (!targetTeam || targetTeam.status !== "APPROVED") {
      return NextResponse.json({ error: "Target team is not an eligible approved team." }, { status: 400 });
    }

    const numScore = Number(score);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 10) {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 10." }, { status: 400 });
    }

    // Check max 5 tens rule
    if (numScore === 10) {
      const existingRatings = Database.getRatingsByRater(currentTeam.id);
      const otherTens = existingRatings.filter(
        (r) => r.target_team_id !== targetTeamId && r.score === 10
      ).length;

      if (otherTens >= 5) {
        return NextResponse.json(
          { error: "You can award a rating of 10 to a maximum of 5 teams. 10s used: 5/5." },
          { status: 400 }
        );
      }
    }

    const saved = await Database.saveDraftRating(currentTeam.id, targetTeamId, numScore);

    // Return current count of tens
    const allRatings = Database.getRatingsByRater(currentTeam.id);
    const tensCount = allRatings.filter((r) => r.score === 10).length;

    return NextResponse.json({
      success: true,
      rating: saved,
      tensUsed: tensCount,
      maxTens: 5,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save rating" }, { status: 500 });
  }
}
