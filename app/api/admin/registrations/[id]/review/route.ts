import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { action, feedback } = body;

    if (!["APPROVE", "REQUEST_CHANGES", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
    }

    const updated = await Database.updateTeamReview(id, action, feedback);
    if (!updated) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      team: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        adminFeedback: updated.admin_feedback,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update review" }, { status: 500 });
  }
}
