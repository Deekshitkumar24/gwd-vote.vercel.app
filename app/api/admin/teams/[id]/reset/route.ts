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
      return NextResponse.json({ error: "Unauthorized. Administrator access required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { error: "A clear administrative reason is required to reset a ballot." },
        { status: 400 }
      );
    }

    const team = Database.getTeamById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    const resetTeam = await Database.resetTeamBallot(id, session.email || "admin", reason);

    return NextResponse.json({
      success: true,
      message: `Ballot for team ${team.code} (${team.name}) has been reset. All cast ratings have been cleared.`,
      team: resetTeam,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reset ballot" }, { status: 500 });
  }
}
