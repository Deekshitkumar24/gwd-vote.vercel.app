import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const body = await req.json();
    const {
      eventId: requestedEventId,
      name,
      leader_name,
      leader_email,
      contact,
      description,
      password,
      members,
    } = body;

    // Resolve event: specified eventId, or active event, or any event with REGISTRATION_OPEN
    let targetEvent = requestedEventId ? Database.getEvent(requestedEventId) : null;
    if (!targetEvent) {
      const allEvents = Database.getAllEvents();
      targetEvent =
        allEvents.find((e) => e.status === "REGISTRATION_OPEN") ||
        Database.getEvent(Database.getActiveEventId());
    }

    if (!targetEvent) {
      return NextResponse.json({ error: "No active event found." }, { status: 404 });
    }

    if (targetEvent.status !== "REGISTRATION_OPEN") {
      return NextResponse.json(
        {
          error: `Team registration is not open for "${targetEvent.name}". Current stage: ${targetEvent.status.replace(/_/g, " ")}.`,
        },
        { status: 403 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "Please provide a Team Name." }, { status: 400 });
    }
    if (!leader_name?.trim()) {
      return NextResponse.json({ error: "Please provide the Team Leader Name." }, { status: 400 });
    }
    if (!leader_email?.trim() || !leader_email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid Leader Email." }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters long." }, { status: 400 });
    }

    // Check duplicate email specifically within this event
    const eventTeams = Database.getAllTeams(targetEvent.id);
    const cleanEmail = leader_email.trim().toLowerCase();
    const cleanName = name.trim().toLowerCase();

    if (eventTeams.some((t) => t.leader_email.toLowerCase() === cleanEmail)) {
      return NextResponse.json(
        { error: `A team is already registered with this email for ${targetEvent.name}.` },
        { status: 409 }
      );
    }

    if (eventTeams.some((t) => t.name.toLowerCase() === cleanName)) {
      return NextResponse.json(
        { error: `A team named "${name}" already exists for this event. Please choose another name.` },
        { status: 409 }
      );
    }

    const { team } = await Database.registerTeam(targetEvent.id, {
      name,
      leader_name,
      leader_email,
      contact,
      description,
      password,
      members,
    });

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        eventId: team.event_id,
        eventName: targetEvent.name,
        code: team.code,
        name: team.name,
        leaderName: team.leader_name,
        leaderEmail: team.leader_email,
        status: team.status,
      },
      message: `Team registered successfully for ${targetEvent.name}! Your assigned Team ID is ${team.code}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
