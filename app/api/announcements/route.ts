import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET() {
  try {
    await Database.ensureSynced();
    const list = Database.getAnnouncements();
    return NextResponse.json({ announcements: list });
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
    const { title, content, is_pinned } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const created = await Database.createAnnouncement(title, content, Boolean(is_pinned));
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
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });

    const updated = await Database.togglePinAnnouncement(id);
    return NextResponse.json({ success: true, announcement: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update pin" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });

    const success = await Database.deleteAnnouncement(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete announcement" }, { status: 500 });
  }
}
