import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvedTeams = Database.getApprovedTeams();
    const teams = approvedTeams.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      leaderName: t.leader_name,
      leaderEmail: t.leader_email,
      contact: t.contact,
      description: t.description,
      status: t.status,
      members: t.members,
      memberCount: t.members?.length || 1,
      approvedAt: t.approved_at,
      submittedAt: t.submitted_at,
    }));

    return NextResponse.json({ teams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load teams" }, { status: 500 });
  }
}
