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

    const list = Database.getAnnouncements(eventId);
    return NextResponse.json({ announcements: list, eventId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load announcements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 403 });
    }

    const body = await req.json();
    const { eventId, title, content, is_pinned } = body;
    const targetEvId = eventId || Database.getActiveEventId();

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const created = await Database.createAnnouncement(targetEvId, title, content, Boolean(is_pinned));
    return NextResponse.json({ success: true, announcement: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create announcement" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, eventId } = body;
    const targetEvId = eventId || Database.getActiveEventId();

    if (!id) return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });

    const updated = await Database.togglePinAnnouncement(targetEvId, id);
    return NextResponse.json({ success: true, announcement: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update pin" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, eventId, title, content, is_pinned } = body;
    const targetEvId = eventId || Database.getActiveEventId();

    if (!id) return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content cannot be blank" }, { status: 400 });
    }

    const updated = await Database.editAnnouncement(targetEvId, id, title, content, is_pinned);
    return NextResponse.json({ success: true, announcement: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to edit announcement" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const eventId = searchParams.get("eventId") || Database.getActiveEventId();

    if (!id) return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });

    const success = await Database.deleteAnnouncement(eventId, id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete announcement" }, { status: 500 });
  }
}
