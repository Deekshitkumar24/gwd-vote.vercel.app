import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    const { searchParams } = new URL(req.url);

    const eventId =
      searchParams.get("eventId") ||
      (session?.role === "team" ? session.eventId : null) ||
      Database.getActiveEventId();

    const list = Database.getDiscussions(eventId);
    return NextResponse.json({ messages: list, eventId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load discussions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Please log in to participate in the discussion." }, { status: 401 });
    }

    const body = await req.json();
    const { content, eventId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    let teamId = "admin";
    let teamName = "Event Organizer";
    let authorName = "Administrator";
    let targetEventId = eventId || Database.getActiveEventId();

    if (session.role === "team" && session.teamId) {
      const team = Database.getTeamById(session.teamId);
      if (!team) {
        return NextResponse.json({ error: "Team not found." }, { status: 404 });
      }
      if (team.status !== "APPROVED") {
        return NextResponse.json({ error: "Only approved teams can post in discussion." }, { status: 403 });
      }
      teamId = team.id;
      teamName = team.name;
      authorName = team.leader_name;
      targetEventId = team.event_id; // Strictly scoped to team's enrolled event
    }

    const event = Database.getEvent(targetEventId);
    if (event?.discussion_enabled === false) {
      return NextResponse.json(
        { error: "Discussions are currently disabled for this event by the administrator." },
        { status: 403 }
      );
    }

    const created = await Database.addDiscussionMessage(targetEventId, teamId, teamName, authorName, content);
    return NextResponse.json({ success: true, message: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to post message" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const eventId = searchParams.get("eventId") || Database.getActiveEventId();

    if (!id) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

    const success = await Database.deleteDiscussionMessage(eventId, id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete message" }, { status: 500 });
  }
}
