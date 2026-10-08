import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Database } from "@/lib/db";
import {
  attachSessionCookie,
  checkRateLimit,
  resetRateLimit,
  SessionPayload,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const body = await req.json();
    const { role, code, email, password, eventId } = body;

    const rateKey = `${ip}:${code || email || "anon"}`;
    if (!checkRateLimit(rateKey, 10, 60000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a minute." },
        { status: 429 }
      );
    }

    await Database.ensureSynced();

    // 1. Administrator login
    if (role === "admin") {
      const adminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@gwd.com").toLowerCase().trim();
      const adminPass = process.env.ADMIN_BOOTSTRAP_PASSWORD || "admin1234";

      const inputEmail = (email || "").toLowerCase().trim();
      if (inputEmail === adminEmail && password === adminPass) {
        resetRateLimit(rateKey);
        await Database.recordAudit("admin", "ADMIN_LOGIN", { email: adminEmail });

        const payload: SessionPayload = {
          role: "admin",
          email: adminEmail,
          createdAt: Date.now(),
        };

        const res = NextResponse.json({
          success: true,
          user: { role: "admin", email: adminEmail },
        });
        return attachSessionCookie(res, payload);
      }

      return NextResponse.json(
        { error: "Invalid administrator email or password." },
        { status: 401 }
      );
    }

    // 2. Team login
    const cleanIdentifier = (code || email || "").trim();
    if (!cleanIdentifier || !password) {
      return NextResponse.json(
        { error: "Please enter your Team ID and password." },
        { status: 400 }
      );
    }

    // Find team: if eventId provided, search that event, else search across events
    const allTeams = Database.getAllTeams(eventId);
    let team = allTeams.find(
      (t) =>
        t.code.toUpperCase() === cleanIdentifier.toUpperCase() ||
        t.leader_email.toLowerCase() === cleanIdentifier.toLowerCase()
    );

    // If not found in target event or no eventId provided, search all events
    if (!team) {
      const allEvents = Database.getAllEvents();
      for (const ev of allEvents) {
        const evTeams = Database.getAllTeams(ev.id);
        const match = evTeams.find(
          (t) =>
            t.code.toUpperCase() === cleanIdentifier.toUpperCase() ||
            t.leader_email.toLowerCase() === cleanIdentifier.toLowerCase()
        );
        if (match) {
          team = match;
          break;
        }
      }
    }

    if (!team) {
      return NextResponse.json(
        { error: "Team not found. Please check your Team ID or registered email." },
        { status: 401 }
      );
    }

    const matches = bcrypt.compareSync(password, team.password_hash);
    if (!matches) {
      return NextResponse.json(
        { error: "Incorrect password for this team." },
        { status: 401 }
      );
    }

    resetRateLimit(rateKey);
    await Database.recordAudit(
      team.code,
      "TEAM_LOGIN",
      { teamName: team.name, eventId: team.event_id },
      team.event_id
    );

    const payload: SessionPayload = {
      role: "team",
      teamId: team.id,
      eventId: team.event_id,
      teamCode: team.code,
      teamName: team.name,
      createdAt: Date.now(),
    };

    const res = NextResponse.json({
      success: true,
      user: {
        role: "team",
        teamId: team.id,
        eventId: team.event_id,
        teamCode: team.code,
        teamName: team.name,
        status: team.status,
      },
    });
    return attachSessionCookie(res, payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
