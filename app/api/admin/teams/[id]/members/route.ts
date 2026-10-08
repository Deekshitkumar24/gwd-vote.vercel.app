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
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { name, role, email } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Member name is required." }, { status: 400 });
    }

    const updated = await Database.addTeamMember(id, { name, role, email });
    if (!updated) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add member" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 403 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required." }, { status: 400 });
    }

    const updated = await Database.removeTeamMember(id, memberId);
    if (!updated) {
      return NextResponse.json({ error: "Team or member not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to remove member" }, { status: 500 });
  }
}
