import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const event = Database.getEvent();

    if (event.status !== "REGISTRATION_OPEN") {
      return NextResponse.json(
        { error: "Team registration is not currently open for this event." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, leader_name, leader_email, contact, description, password, members } = body;

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

    const allTeams = Database.getAllTeams();
    const cleanEmail = leader_email.trim().toLowerCase();
    const cleanName = name.trim().toLowerCase();

    if (allTeams.some((t) => t.leader_email.toLowerCase() === cleanEmail)) {
      return NextResponse.json(
        { error: "A team is already registered with this leader email." },
        { status: 409 }
      );
    }

    if (allTeams.some((t) => t.name.toLowerCase() === cleanName)) {
      return NextResponse.json(
        { error: "A team with this name already exists. Please choose another name." },
        { status: 409 }
      );
    }

    const { team } = await Database.registerTeam({
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
        code: team.code,
        name: team.name,
        leaderName: team.leader_name,
        leaderEmail: team.leader_email,
        status: team.status,
      },
      message: `Team registered successfully! Your assigned Team ID is ${team.code}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
