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

    const eventId = currentTeam.event_id;
    const event = Database.getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const allowedStatuses = ["VOTING_OPEN", "VOTING_CLOSED", "RESULTS_READY", "RESULTS_PUBLISHED", "ARCHIVED"];
    if (!allowedStatuses.includes(event.status)) {
      return NextResponse.json(
        { error: "Voting is not currently accessible for this event." },
        { status: 403 }
      );
    }

    // Dynamic Team Count: Return all approved teams in THIS event EXCEPT self
    const allApproved = Database.getApprovedTeams(eventId);
    const eligibleTargets = allApproved
      .filter((t) => t.id !== currentTeam.id)
      .map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        leaderName: t.leader_name,
        description: t.description || "",
      }));

    const maxTensAllowed = Math.min(event.max_tens || 5, eligibleTargets.length);

    return NextResponse.json({
      eventId,
      eventName: event.name,
      eligibleTeams: eligibleTargets,
      totalRequired: eligibleTargets.length,
      maxTensAllowed,
      isLocked: currentTeam.submitted_at !== null || event.status !== "VOTING_OPEN",
      submittedAt: currentTeam.submitted_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load eligible teams" }, { status: 500 });
  }
}
