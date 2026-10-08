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
    if (event?.allow_member_edits === false) {
      return NextResponse.json({ error: "Member editing is disabled by the event administrator." }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, email } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Member name is required." }, { status: 400 });
    }

    const updated = await Database.addTeamMember(session.teamId, { name, role, email });
    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add member" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    if (event?.allow_member_edits === false) {
      return NextResponse.json({ error: "Member editing is disabled by the event administrator." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required." }, { status: 400 });
    }

    // Do not allow removing the Team Leader
    const member = team.members.find((m) => m.id === memberId);
    if (member?.role === "Team Leader") {
      return NextResponse.json({ error: "The Team Leader cannot be removed from the team roster." }, { status: 400 });
    }

    const updated = await Database.removeTeamMember(session.teamId, memberId);
    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to remove member" }, { status: 500 });
  }
}
