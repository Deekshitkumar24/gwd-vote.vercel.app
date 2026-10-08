import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 403 });
    }

    const body = await req.json();
    const { eventId, reason } = body;

    const targetId = eventId || Database.getActiveEventId();
    const existing = Database.getEvent(targetId);
    if (!existing) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (existing.status === "ARCHIVED") {
      return NextResponse.json({ error: "Archived events cannot be deactivated." }, { status: 400 });
    }

    const updated = await Database.deactivateEvent(targetId, reason);
    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("Deactivate event error:", err);
    return NextResponse.json({ error: err.message || "Failed to deactivate event" }, { status: 500 });
  }
}
