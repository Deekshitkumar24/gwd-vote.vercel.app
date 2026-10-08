import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || Database.getActiveEventId();
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();

    let teams = Database.getAllTeams(eventId);

    if (statusFilter !== "ALL") {
      teams = teams.filter((t) => t.status === statusFilter);
    }

    if (search) {
      teams = teams.filter(
        (t) =>
          t.code.toLowerCase().includes(search) ||
          t.name.toLowerCase().includes(search) ||
          t.leader_name.toLowerCase().includes(search) ||
          t.leader_email.toLowerCase().includes(search)
      );
    }

    // Sort: PENDING first, then by registration date desc
    teams.sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
      return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime();
    });

    const result = teams.map((t) => ({
      id: t.id,
      eventId: t.event_id,
      code: t.code,
      name: t.name,
      leaderName: t.leader_name,
      leaderEmail: t.leader_email,
      contact: t.contact,
      description: t.description,
      status: t.status,
      adminFeedback: t.admin_feedback,
      memberCount: t.members?.length || 1,
      members: t.members,
      registeredAt: t.registered_at,
      approvedAt: t.approved_at,
      submittedAt: t.submitted_at,
    }));

    return NextResponse.json({ registrations: result, eventId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load registrations" }, { status: 500 });
  }
}
