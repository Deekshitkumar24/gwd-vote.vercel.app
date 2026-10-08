import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
    }

    const body = await req.json();
    const { sourceEventId, customName } = body;

    if (!sourceEventId) {
      return NextResponse.json({ error: "Source event ID is required." }, { status: 400 });
    }

    const duplicated = await Database.duplicateEventSettings(sourceEventId, customName);
    if (!duplicated) {
      return NextResponse.json({ error: "Source event not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Configuration duplicated to new event "${duplicated.name}". No historical teams or votes were copied.`,
      event: duplicated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to duplicate event" }, { status: 500 });
  }
}
