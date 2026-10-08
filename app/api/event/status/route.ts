import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/db";
import { WORKFLOW_TRANSITIONS, STATUS_DESCRIPTIONS } from "@/lib/rules";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const event = Database.getEvent();
    const allTeams = Database.getAllTeams();
    const approvedTeams = allTeams.filter((t) => t.status === "APPROVED");
    const pendingTeams = allTeams.filter((t) => t.status === "PENDING");
    const changesRequested = allTeams.filter((t) => t.status === "CHANGES_REQUESTED");
    const rejectedTeams = allTeams.filter((t) => t.status === "REJECTED");

    let totalMembers = 0;
    for (const t of allTeams) {
      totalMembers += t.members?.length || 1;
    }

    const submittedBallots = approvedTeams.filter((t) => t.submitted_at !== null).length;
    const remainingBallots = approvedTeams.length - submittedBallots;
    const completionPercent =
      approvedTeams.length > 0 ? Math.round((submittedBallots / approvedTeams.length) * 100) : 0;

    const transition = WORKFLOW_TRANSITIONS[event.status];
    const description = STATUS_DESCRIPTIONS[event.status];

    return NextResponse.json({
      event,
      stats: {
        teamsRegistered: allTeams.length,
        pendingReview: pendingTeams.length,
        approvedTeams: approvedTeams.length,
        changesRequested: changesRequested.length,
        rejectedTeams: rejectedTeams.length,
        totalMembers,
        voting: {
          totalEligibleVoters: approvedTeams.length,
          submitted: submittedBallots,
          remaining: remainingBallots,
          completionPercent,
        },
      },
      nextAction: transition,
      statusDescription: description,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load event status" }, { status: 500 });
  }
}
