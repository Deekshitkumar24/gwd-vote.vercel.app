import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      eventId,
      name,
      description,
      max_tens,
      leaderboard_public,
      leaderboard_visibility,
      discussion_enabled,
      announcements_enabled,
      allow_member_edits,
      registration_start,
      registration_end,
      voting_start,
      voting_end,
    } = body;

    const targetId = eventId || Database.getActiveEventId();
    const existing = Database.getEvent(targetId);
    if (!existing) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (existing.status === "ARCHIVED") {
      return NextResponse.json({ error: "Archived events cannot be modified." }, { status: 400 });
    }

    const updated = await Database.updateEventSettings(targetId, {
      name,
      description,
      max_tens,
      leaderboard_public,
      leaderboard_visibility,
      discussion_enabled,
      announcements_enabled,
      allow_member_edits,
      registration_start,
      registration_end,
      voting_start,
      voting_end,
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("Update event settings error:", err);
    return NextResponse.json({ error: err.message || "Failed to update settings" }, { status: 500 });
  }
}
