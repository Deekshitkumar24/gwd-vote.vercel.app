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
    if (!currentTeam || currentTeam.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved teams are eligible to participate in voting." },
        { status: 403 }
      );
    }

    const event = Database.getEvent();
    const allowedStatuses = ["VOTING_OPEN", "VOTING_CLOSED", "RESULTS_READY", "RESULTS_PUBLISHED"];
    if (!allowedStatuses.includes(event.status)) {
      return NextResponse.json(
        { error: "Voting is not currently accessible for this event." },
        { status: 403 }
      );
    }

    // Dynamic Team Count: Return all approved teams EXCEPT self
    const allApproved = Database.getApprovedTeams();
    const eligibleTargets = allApproved
      .filter((t) => t.id !== currentTeam.id)
      .map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        leaderName: t.leader_name,
        description: t.description || "",
      }));

    return NextResponse.json({
      eligibleTeams: eligibleTargets,
      totalRequired: eligibleTargets.length,
      maxTensAllowed: Math.min(5, eligibleTargets.length),
      isLocked: currentTeam.submitted_at !== null || event.status !== "VOTING_OPEN",
      submittedAt: currentTeam.submitted_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load eligible teams" }, { status: 500 });
  }
}
