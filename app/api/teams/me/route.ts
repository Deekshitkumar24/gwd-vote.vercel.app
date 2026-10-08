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

    const team = Database.getTeamById(session.teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      team: {
        id: team.id,
        code: team.code,
        name: team.name,
        leaderName: team.leader_name,
        leaderEmail: team.leader_email,
        contact: team.contact,
        description: team.description,
        status: team.status,
        adminFeedback: team.admin_feedback,
        members: team.members,
        registeredAt: team.registered_at,
        approvedAt: team.approved_at,
        submittedAt: team.submitted_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load team" }, { status: 500 });
  }
}
