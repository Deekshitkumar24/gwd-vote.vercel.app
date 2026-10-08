import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "team" || !session.teamId) {
      return NextResponse.json({ error: "Unauthorized. Team authentication required." }, { status: 403 });
    }

    const team = Database.getTeamById(session.teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    const event = Database.getEvent(team.event_id);
    if (!event || event.status !== "REGISTRATION_OPEN") {
      return NextResponse.json(
        { error: "Teams can only withdraw while the event is in the Registration Open stage." },
        { status: 400 }
      );
    }

    const updated = await Database.withdrawTeam(session.teamId);
    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to withdraw registration" }, { status: 500 });
  }
}
