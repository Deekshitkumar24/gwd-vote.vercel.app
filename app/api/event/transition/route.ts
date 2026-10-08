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
    const { eventId, targetStatus } = body;

    const targetEvId = eventId || Database.getActiveEventId();
    const currentEvent = Database.getEvent(targetEvId);

    if (!currentEvent) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    // Historical event protection: Archived events cannot be modified
    if (currentEvent.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "This event has been concluded and archived. It cannot be modified." },
        { status: 400 }
      );
    }

    const transition = WORKFLOW_TRANSITIONS[currentEvent.status];

    if (!targetStatus) {
      if (!transition.nextStatus) {
        return NextResponse.json({ error: "Event is already in its final state." }, { status: 400 });
      }
      const updated = await Database.updateEventStatus(currentEvent.id, transition.nextStatus);
      return NextResponse.json({ success: true, event: updated });
    }

    const isAllowedShortcut =
      (currentEvent.status === "VOTING_CLOSED" && targetStatus === "RESULTS_PUBLISHED");

    if (targetStatus !== transition.nextStatus && !isAllowedShortcut) {
      return NextResponse.json(
        { error: `Invalid transition from ${currentEvent.status} to ${targetStatus}.` },
        { status: 400 }
      );
    }

    const updated = await Database.updateEventStatus(currentEvent.id, targetStatus as EventStatus);
    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
