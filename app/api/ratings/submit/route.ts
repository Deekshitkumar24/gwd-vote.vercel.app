import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";
import { validateFinalRatings } from "@/lib/rules";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "team" || !session.teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentTeam = Database.getTeamById(session.teamId);
    if (!currentTeam || currentTeam.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved teams can submit a ballot." }, { status: 403 });
    }

    if (currentTeam.submitted_at !== null) {
      return NextResponse.json({ error: "Your ballot has already been submitted." }, { status: 409 });
    }

    const event = Database.getEvent();
    if (event.status !== "VOTING_OPEN") {
      return NextResponse.json({ error: "Voting is not currently open for submission." }, { status: 403 });
    }

    const allApproved = Database.getApprovedTeams();
    const eligibleTargets = allApproved.filter((t) => t.id !== currentTeam.id).map((t) => t.id);

    const savedRatings = Database.getRatingsByRater(currentTeam.id).map((r) => ({
      targetTeamId: r.target_team_id,
      score: r.score,
    }));

    const validation = validateFinalRatings(
      currentTeam.id,
      savedRatings,
      eligibleTargets,
      5
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error || "Ballot validation failed.",
          code: validation.code,
        },
        { status: 400 }
      );
    }

    const updated = await Database.submitFinalBallot(currentTeam.id);

    return NextResponse.json({
      success: true,
      message: "Your ballot has been submitted successfully.",
      submittedAt: updated?.submitted_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit ballot" }, { status: 500 });
  }
}
