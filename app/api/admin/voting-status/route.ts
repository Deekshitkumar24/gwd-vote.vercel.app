import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvedTeams = Database.getApprovedTeams();
    const allRatings = Database.getAllRatings();
    const totalRequired = Math.max(0, approvedTeams.length - 1);

    const statusList = approvedTeams.map((team) => {
      const teamRatings = allRatings.filter((r) => r.rater_team_id === team.id);
      const isSubmitted = team.submitted_at !== null;
      let status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" = "NOT_STARTED";
      if (isSubmitted) {
        status = "SUBMITTED";
      } else if (teamRatings.length > 0) {
        status = "IN_PROGRESS";
      }

      return {
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        leaderName: team.leader_name,
        ratedCount: teamRatings.length,
        totalRequired,
        tensUsed: teamRatings.filter((r) => r.score === 10).length,
        status,
        submittedAt: team.submitted_at,
      };
    });

    const submittedCount = statusList.filter((s) => s.status === "SUBMITTED").length;
    const inProgressCount = statusList.filter((s) => s.status === "IN_PROGRESS").length;
    const notStartedCount = statusList.filter((s) => s.status === "NOT_STARTED").length;

    return NextResponse.json({
      summary: {
        totalEligibleVoters: approvedTeams.length,
        totalRequiredPerTeam: totalRequired,
        submittedCount,
        inProgressCount,
        notStartedCount,
        completionPercent:
          approvedTeams.length > 0 ? Math.round((submittedCount / approvedTeams.length) * 100) : 0,
      },
      teams: statusList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load voting status" }, { status: 500 });
  }
}
