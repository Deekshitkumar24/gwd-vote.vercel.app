import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
    }

    const events = Database.getAllEvents();
    const activeEventId = Database.getActiveEventId();

    const enriched = events.map((ev) => {
      const teams = Database.getAllTeams(ev.id);
      const approved = teams.filter((t) => t.status === "APPROVED");
      const submitted = approved.filter((t) => t.submitted_at !== null);

      return {
        id: ev.id,
        name: ev.name,
        description: ev.description || "",
        status: ev.status,
        leaderboard_public: ev.leaderboard_public,
        max_tens: ev.max_tens,
        registration_start: ev.registration_start,
        registration_end: ev.registration_end,
        voting_start: ev.voting_start,
        voting_end: ev.voting_end,
        created_at: ev.created_at,
        updated_at: ev.updated_at,
        archived_at: ev.archived_at,
        isActive: ev.id === activeEventId,
        teamCount: teams.length,
        approvedCount: approved.length,
        submittedCount: submitted.length,
      };
    });

    return NextResponse.json({
      activeEventId,
      events: enriched,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      max_tens,
      leaderboard_public,
      registration_start,
      registration_end,
      voting_start,
      voting_end,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Event name is required." }, { status: 400 });
    }

    const created = await Database.createEvent({
      name: name.trim(),
      description: description?.trim() || "",
      max_tens: typeof max_tens === "number" && max_tens > 0 ? max_tens : 5,
      leaderboard_public: Boolean(leaderboard_public),
      registration_start,
      registration_end,
      voting_start,
      voting_end,
    });

    return NextResponse.json({
      success: true,
      message: `Event "${created.name}" created successfully in Draft status.`,
      event: created,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create event" }, { status: 500 });
  }
}
