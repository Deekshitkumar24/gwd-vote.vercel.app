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

    const audits = Database.getAudits();
    return NextResponse.json({ audits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load audit history" }, { status: 500 });
  }
}
