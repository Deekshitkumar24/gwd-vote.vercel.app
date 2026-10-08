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

    const eventId = currentTeam.event_id;
    const event = Database.getEvent(eventId);
    if (!event || event.status !== "VOTING_OPEN") {
      return NextResponse.json({ error: "Voting is not currently open for this event." }, { status: 403 });
    }

    const body = await req.json();
    const { targetTeamId, score } = body;

    if (!targetTeamId) {
      return NextResponse.json({ error: "Target team is required." }, { status: 400 });
    }

    if (targetTeamId === currentTeam.id) {
      return NextResponse.json({ error: "A team cannot rate itself." }, { status: 400 });
    }

    // Target team must belong to the exact same event!
    const targetTeam = Database.getTeamById(targetTeamId);
    if (!targetTeam || targetTeam.event_id !== eventId || targetTeam.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Target team is not an eligible participating team in this event." },
        { status: 400 }
      );
    }

    const numScore = Number(score);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 10) {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 10." }, { status: 400 });
    }

    const maxTensAllowed = event.max_tens || 5;

    // Check max tens rule
    if (numScore === 10) {
      const existingRatings = Database.getRatingsByRater(eventId, currentTeam.id);
      const otherTens = existingRatings.filter(
        (r) => r.target_team_id !== targetTeamId && r.score === 10
      ).length;

      if (otherTens >= maxTensAllowed) {
        return NextResponse.json(
          {
            error: `You can award a rating of 10 to a maximum of ${maxTensAllowed} teams. 10s used: ${maxTensAllowed}/${maxTensAllowed}.`,
          },
          { status: 400 }
        );
      }
    }

    const saved = await Database.saveDraftRating(eventId, currentTeam.id, targetTeamId, numScore);

    const allRatings = Database.getRatingsByRater(eventId, currentTeam.id);
    const tensCount = allRatings.filter((r) => r.score === 10).length;

    return NextResponse.json({
      success: true,
      rating: saved,
      tensUsed: tensCount,
      maxTens: maxTensAllowed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save rating" }, { status: 500 });
  }
}
