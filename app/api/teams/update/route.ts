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

    const team = Database.getTeamById(session.teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, leader_name, contact, description, members } = body;

    const updated = await Database.updateTeamDetails(team.id, {
      name,
      leader_name,
      contact,
      description,
      members,
    });

    return NextResponse.json({
      success: true,
      team: updated,
      message: "Team information updated successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update team" }, { status: 500 });
  }
}
