import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";
import { WORKFLOW_TRANSITIONS, EventStatus } from "@/lib/rules";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Administrator permissions required." }, { status: 403 });
    }

    const body = await req.json();
    const { targetStatus } = body;

    const currentEvent = Database.getEvent();
    const transition = WORKFLOW_TRANSITIONS[currentEvent.status];

    if (!targetStatus) {
      if (!transition.nextStatus) {
        return NextResponse.json({ error: "Event is already in its final state." }, { status: 400 });
      }
      const updated = await Database.updateEventStatus(transition.nextStatus);
      return NextResponse.json({ success: true, event: updated });
    }

    // If explicit targetStatus requested, ensure it's valid
    if (targetStatus !== transition.nextStatus) {
      return NextResponse.json(
        { error: `Invalid transition from ${currentEvent.status} to ${targetStatus}.` },
        { status: 400 }
      );
    }

    const updated = await Database.updateEventStatus(targetStatus as EventStatus);
    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
