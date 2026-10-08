export type EventStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "VOTING_READY"
  | "VOTING_OPEN"
  | "VOTING_CLOSED"
  | "RESULTS_READY"
  | "RESULTS_PUBLISHED"
  | "ARCHIVED"
  | "DEACTIVATED";

export type TeamStatus =
  | "PENDING"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "WITHDRAWN";

export interface StatusTransition {
  from: EventStatus;
  to: EventStatus;
  actionLabel: string;
  confirmTitle: string;
  confirmDescription: string;
}

export const WORKFLOW_TRANSITIONS: Record<EventStatus, { nextStatus: EventStatus | null; actionLabel: string; confirmTitle: string; confirmDescription: string }> = {
  DRAFT: {
    nextStatus: "REGISTRATION_OPEN",
    actionLabel: "Start Registration",
    confirmTitle: "Start registration?",
    confirmDescription: "Teams will now be able to register for this event.",
  },
  REGISTRATION_OPEN: {
    nextStatus: "REGISTRATION_CLOSED",
    actionLabel: "End Registration",
    confirmTitle: "End registration?",
    confirmDescription: "No further team registrations or changes will be accepted.",
  },
  REGISTRATION_CLOSED: {
    nextStatus: "VOTING_READY",
    actionLabel: "Prepare Voting",
    confirmTitle: "Prepare voting stage?",
    confirmDescription: "Freeze rosters and prepare the voting ballot for approved teams.",
  },
  VOTING_READY: {
    nextStatus: "VOTING_OPEN",
    actionLabel: "Start Voting",
    confirmTitle: "Start voting?",
    confirmDescription: "Approved teams will be able to cast and submit their ratings.",
  },
  VOTING_OPEN: {
    nextStatus: "VOTING_CLOSED",
    actionLabel: "End Voting",
    confirmTitle: "End voting?",
    confirmDescription: "Voting will be closed and all ballots locked.",
  },
  VOTING_CLOSED: {
    nextStatus: "RESULTS_READY",
    actionLabel: "View Results",
    confirmTitle: "Prepare results?",
    confirmDescription: "Calculate the official leaderboard rankings and review results.",
  },
  RESULTS_READY: {
    nextStatus: "RESULTS_PUBLISHED",
    actionLabel: "Publish Results",
    confirmTitle: "Publish results?",
    confirmDescription: "The final leaderboard and ranks will become visible to teams and attendees.",
  },
  RESULTS_PUBLISHED: {
    nextStatus: "ARCHIVED",
    actionLabel: "Archive Event",
    confirmTitle: "Archive event?",
    confirmDescription: "Lock this event permanently for historical reference.",
  },
  ARCHIVED: {
    nextStatus: null,
    actionLabel: "Event Archived",
    confirmTitle: "",
    confirmDescription: "",
  },
  DEACTIVATED: {
    nextStatus: null,
    actionLabel: "Event Deactivated",
    confirmTitle: "",
    confirmDescription: "",
  },
};

export const STATUS_DESCRIPTIONS: Record<EventStatus, { title: string; subtitle: string; whatHappensNext: string }> = {
  DRAFT: {
    title: "Draft Mode",
    subtitle: "The event is currently being set up. Registration is not yet open.",
    whatHappensNext: "When you are ready, start registration to allow teams to register their members.",
  },
  REGISTRATION_OPEN: {
    title: "Registration Open",
    subtitle: "Teams can currently register for this event.",
    whatHappensNext: "Review submitted registrations while teams continue registering.",
  },
  REGISTRATION_CLOSED: {
    title: "Registration Closed",
    subtitle: "Team registration has ended. All registrations are locked for review.",
    whatHappensNext: "Review and approve all participating teams, then prepare the voting phase.",
  },
  VOTING_READY: {
    title: "Voting Ready",
    subtitle: "Rosters are set. The ballot is ready for participating teams.",
    whatHappensNext: "Start voting whenever the team presentations and showcase begin.",
  },
  VOTING_OPEN: {
    title: "Voting Open",
    subtitle: "Teams are actively rating other teams.",
    whatHappensNext: "Monitor voting progress as teams submit their ballots.",
  },
  VOTING_CLOSED: {
    title: "Voting Closed",
    subtitle: "Voting has concluded. Ballots are locked.",
    whatHappensNext: "Review final scores and verify the leaderboard standings.",
  },
  RESULTS_READY: {
    title: "Results Ready",
    subtitle: "Official standings and scores have been calculated.",
    whatHappensNext: "Publish the results to announce rankings to all participants.",
  },
  RESULTS_PUBLISHED: {
    title: "Results Published",
    subtitle: "The official leaderboard and rankings are live for everyone to view.",
    whatHappensNext: "You can view the final leaderboard or archive the event when concluded.",
  },
  ARCHIVED: {
    title: "Event Archived",
    subtitle: "This event has officially concluded and is stored in the archives.",
    whatHappensNext: "All event records and final results are saved for future reference.",
  },
  DEACTIVATED: {
    title: "Event Deactivated",
    subtitle: "This event is currently paused/deactivated by the administrator.",
    whatHappensNext: "Normal participation is suspended. You can reactivate the event at any time.",
  },
};

export interface RatingItem {
  targetTeamId: string;
  score: number;
}

export interface ValidationResult {
  valid: boolean;
  code?: string;
  error?: string;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamCode: string;
  teamName: string;
  avgScore: number;
  ratingsReceived: number;
  tensReceived: number;
  ninesReceived: number;
  isTied: boolean;
}

export interface DynamicProgress {
  totalEligibleTargets: number; // N - 1
  ratedCount: number;
  remainingCount: number;
  tensUsed: number;
  maxTensAllowed: number;
  tensRemaining: number;
  isComplete: boolean;
  canGiveTen: boolean;
}

export function countTens(ratings: RatingItem[]): number {
  return ratings.filter((r) => r.score === 10).length;
}

export function countNines(ratings: RatingItem[]): number {
  return ratings.filter((r) => r.score === 9).length;
}

export function computeDynamicProgress(
  ratings: RatingItem[],
  totalActiveApprovedTeams: number,
  maxTensConfig: number = 5
): DynamicProgress {
  const totalEligibleTargets = Math.max(0, totalActiveApprovedTeams - 1);
  const maxTensAllowed = Math.min(maxTensConfig, totalEligibleTargets);
  const ratedCount = ratings.length;
  const remainingCount = Math.max(0, totalEligibleTargets - ratedCount);
  const tensUsed = countTens(ratings);
  const tensRemaining = Math.max(0, maxTensAllowed - tensUsed);
  const isComplete = totalEligibleTargets > 0 && ratedCount === totalEligibleTargets;
  const canGiveTen = tensUsed < maxTensAllowed;

  return {
    totalEligibleTargets,
    ratedCount,
    remainingCount,
    tensUsed,
    maxTensAllowed,
    tensRemaining,
    isComplete,
    canGiveTen,
  };
}

/**
 * Validates a rating submission according to all business rules:
 * - Scores must be 1 to 10 integers
 * - Self-rating is strictly forbidden
 * - Max 5 ratings of 10
 * - All eligible other teams must be rated
 */
export function validateFinalRatings(
  raterTeamId: string,
  submittedRatings: RatingItem[],
  eligibleTargetTeamIds: string[],
  maxTensConfig: number = 5
): ValidationResult {
  const eligibleSet = new Set(eligibleTargetTeamIds);
  const totalRequired = eligibleTargetTeamIds.length;
  const maxTensAllowed = Math.min(maxTensConfig, totalRequired);

  if (totalRequired === 0) {
    return {
      valid: false,
      code: "NOT_ENOUGH_TEAMS",
      error: "There are not enough participating teams to vote.",
    };
  }

  // Self-rating check
  for (const item of submittedRatings) {
    if (item.targetTeamId === raterTeamId) {
      return {
        valid: false,
        code: "SELF_RATING",
        error: "A team cannot rate itself.",
      };
    }
  }

  // Score validation
  for (const item of submittedRatings) {
    if (!Number.isInteger(item.score) || item.score < 1 || item.score > 10) {
      return {
        valid: false,
        code: "INVALID_SCORE",
        error: `Rating score must be an integer between 1 and 10. Found: ${item.score}`,
      };
    }
  }

  // Target team validity check
  const ratedTargets = new Set<string>();
  for (const item of submittedRatings) {
    if (!eligibleSet.has(item.targetTeamId)) {
      return {
        valid: false,
        code: "INELIGIBLE_TARGET",
        error: "Rating target team is not an eligible participating team.",
      };
    }
    if (ratedTargets.has(item.targetTeamId)) {
      return {
        valid: false,
        code: "DUPLICATE_RATING",
        error: "Duplicate rating submitted for the same team.",
      };
    }
    ratedTargets.add(item.targetTeamId);
  }

  // Incomplete ballot check
  if (ratedTargets.size !== totalRequired) {
    const missing = totalRequired - ratedTargets.size;
    return {
      valid: false,
      code: "INCOMPLETE_BALLOT",
      error: `You must rate all ${totalRequired} eligible teams before submitting. ${missing} team${missing > 1 ? "s" : ""} remaining.`,
    };
  }

  // Max 5 tens check
  const tensCount = countTens(submittedRatings);
  if (tensCount > maxTensAllowed) {
    return {
      valid: false,
      code: "MAX_TENS_EXCEEDED",
      error: `You can award a rating of 10 to a maximum of ${maxTensAllowed} teams. You selected ${tensCount}.`,
    };
  }

  return { valid: true };
}

/**
 * Computes official leaderboard according to specification:
 * 1. Highest average rating
 * 2. Highest number of 10 ratings
 * 3. Highest number of 9 ratings
 * 4. Tied teams share the same rank
 */
export function computeLeaderboard(
  teams: Array<{ id: string; code: string; name: string }>,
  ratings: Array<{ targetTeamId: string; score: number }>
): LeaderboardEntry[] {
  if (teams.length === 0) return [];

  // Group ratings by target team
  const scoreMap = new Map<string, { totalScore: number; count: number; tens: number; nines: number }>();
  for (const team of teams) {
    scoreMap.set(team.id, { totalScore: 0, count: 0, tens: 0, nines: 0 });
  }

  for (const r of ratings) {
    const entry = scoreMap.get(r.targetTeamId);
    if (entry) {
      entry.totalScore += r.score;
      entry.count += 1;
      if (r.score === 10) entry.tens += 1;
      if (r.score === 9) entry.nines += 1;
    }
  }

  const entries = teams.map((team) => {
    const data = scoreMap.get(team.id) || { totalScore: 0, count: 0, tens: 0, nines: 0 };
    const avg = data.count > 0 ? parseFloat((data.totalScore / data.count).toFixed(2)) : 0.0;
    return {
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      avgScore: avg,
      ratingsReceived: data.count,
      tensReceived: data.tens,
      ninesReceived: data.nines,
    };
  });

  // Sort according to ranking rules
  entries.sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    if (b.tensReceived !== a.tensReceived) return b.tensReceived - a.tensReceived;
    if (b.ninesReceived !== a.ninesReceived) return b.ninesReceived - a.ninesReceived;
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign ranks with ties
  const ranked: LeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    if (i > 0) {
      const prev = entries[i - 1];
      const isIdentical =
        prev.avgScore === item.avgScore &&
        prev.tensReceived === item.tensReceived &&
        prev.ninesReceived === item.ninesReceived;

      if (!isIdentical) {
        currentRank = i + 1;
      }
    }

    const next = entries[i + 1];
    const prev = entries[i - 1];
    const isTiedWithNext =
      next &&
      next.avgScore === item.avgScore &&
      next.tensReceived === item.tensReceived &&
      next.ninesReceived === item.ninesReceived;
    const isTiedWithPrev =
      prev &&
      prev.avgScore === item.avgScore &&
      prev.tensReceived === item.tensReceived &&
      prev.ninesReceived === item.ninesReceived;

    ranked.push({
      ...item,
      rank: currentRank,
      isTied: Boolean(isTiedWithNext || isTiedWithPrev),
    });
  }

  return ranked;
}
