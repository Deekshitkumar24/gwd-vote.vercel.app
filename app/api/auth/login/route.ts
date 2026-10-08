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
    const { role, code, email, password } = body;

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

    // Allow lookup by generated code (GWD-101) or leader email
    let team = Database.getTeamByCode(cleanIdentifier);
    if (!team) {
      team = Database.getTeamByEmail(cleanIdentifier);
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
    await Database.recordAudit(team.code, "TEAM_LOGIN", { teamName: team.name });

    const payload: SessionPayload = {
      role: "team",
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      createdAt: Date.now(),
    };

    const res = NextResponse.json({
      success: true,
      user: {
        role: "team",
        teamId: team.id,
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
