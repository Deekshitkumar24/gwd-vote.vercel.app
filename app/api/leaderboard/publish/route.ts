import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { isPublic } = body;

    const updated = await Database.setLeaderboardPublic(Boolean(isPublic));
    return NextResponse.json({
      success: true,
      leaderboardPublic: updated.leaderboard_public,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update leaderboard visibility" }, { status: 500 });
  }
}
