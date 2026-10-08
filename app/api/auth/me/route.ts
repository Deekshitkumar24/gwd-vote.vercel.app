import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  await Database.ensureSynced();
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  if (session.role === "admin") {
    return NextResponse.json({
      authenticated: true,
      user: {
        role: "admin",
        email: session.email,
      },
    });
  }

  if (session.role === "team" && session.teamId) {
    const team = Database.getTeamById(session.teamId);
    if (!team) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        role: "team",
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        leaderName: team.leader_name,
        leaderEmail: team.leader_email,
        status: team.status,
        adminFeedback: team.admin_feedback,
        submittedAt: team.submitted_at,
        members: team.members,
      },
    });
  }

  return NextResponse.json({ authenticated: false, user: null });
}
