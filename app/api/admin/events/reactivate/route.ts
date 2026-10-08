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
    const { eventId } = body;

    const targetId = eventId || Database.getActiveEventId();
    const existing = Database.getEvent(targetId);
    if (!existing) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const updated = await Database.reactivateEvent(targetId);
    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("Reactivate event error:", err);
    return NextResponse.json({ error: err.message || "Failed to reactivate event" }, { status: 500 });
  }
}
