import crypto from "crypto";
import bcrypt from "bcryptjs";
import { EventStatus, TeamStatus } from "@/lib/rules";
import { isMongoConfigured, loadStateFromMongo, saveStateToMongo } from "./mongo";

export type { EventStatus, TeamStatus };

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

export interface TeamRecord {
  id: string;
  code: string; // Unique system-generated ID: e.g. GWD-101
  name: string;
  leader_name: string;
  leader_email: string;
  contact?: string;
  description?: string;
  password_hash: string;
  status: TeamStatus;
  admin_feedback?: string | null;
  members: TeamMember[];
  registered_at: string;
  approved_at: string | null;
  submitted_at: string | null;
}

export interface RatingRecord {
  id: string;
  rater_team_id: string;
  target_team_id: string;
  score: number;
  updated_at: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export interface DiscussionRecord {
  id: string;
  team_id: string;
  team_name: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details?: Record<string, any>;
}

export interface EventRecord {
  id: string;
  name: string;
  status: EventStatus;
  leaderboard_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseState {
  event: EventRecord;
  teams: TeamRecord[];
  ratings: RatingRecord[];
  announcements: AnnouncementRecord[];
  discussions: DiscussionRecord[];
  audits: AuditRecord[];
  nextTeamSeq: number;
}

const DEFAULT_STATE: DatabaseState = {
  event: {
    id: "gwd-annual-2026",
    name: "GWD Team Hackathon & Showcase",
    status: "DRAFT",
    leaderboard_public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  teams: [],
  ratings: [],
  announcements: [],
  discussions: [],
  audits: [],
  nextTeamSeq: 101,
};

let memoryState: DatabaseState = JSON.parse(JSON.stringify(DEFAULT_STATE));
let isSyncedWithMongo = false;
let syncPromise: Promise<void> | null = null;

export class Database {
  public static async ensureSynced(): Promise<void> {
    if (isSyncedWithMongo) return;
    if (!isMongoConfigured()) return;

    if (!syncPromise) {
      syncPromise = (async () => {
        try {
          const remote = await loadStateFromMongo<DatabaseState>();
          if (remote && remote.event) {
            memoryState = {
              ...DEFAULT_STATE,
              ...remote,
              event: { ...DEFAULT_STATE.event, ...remote.event },
              teams: Array.isArray(remote.teams) ? remote.teams : [],
              ratings: Array.isArray(remote.ratings) ? remote.ratings : [],
              announcements: Array.isArray(remote.announcements) ? remote.announcements : [],
              discussions: Array.isArray(remote.discussions) ? remote.discussions : [],
              audits: Array.isArray(remote.audits) ? remote.audits : [],
              nextTeamSeq: typeof remote.nextTeamSeq === "number" ? remote.nextTeamSeq : 101,
            };
          } else {
            // First time initialization in MongoDB Atlas
            await saveStateToMongo(memoryState);
          }
          isSyncedWithMongo = true;
        } catch (err) {
          console.warn("Failed to synchronize with MongoDB Atlas, using in-memory state:", err);
        }
      })();
    }
    await syncPromise;
  }

  public static async persist(): Promise<void> {
    if (isMongoConfigured()) {
      await saveStateToMongo(memoryState);
    }
  }

  public static async unlockTeamBallot(teamId: string, adminEmail: string, reason: string): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;
    const prev = team.submitted_at;
    team.submitted_at = null;
    await this.recordAudit("admin", "BALLOT_UNLOCKED", {
      administrator: adminEmail,
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      reason: reason.trim(),
      previousState: `SUBMITTED (${prev})`,
      newState: "UNLOCKED",
    });
    await this.persist();
    return team;
  }

  // EVENT
  public static getEvent(): EventRecord {
    return memoryState.event;
  }

  public static async updateEventStatus(nextStatus: EventStatus): Promise<EventRecord> {
    memoryState.event.status = nextStatus;
    memoryState.event.updated_at = new Date().toISOString();
    await this.recordAudit("admin", "EVENT_STATUS_CHANGE", { nextStatus });
    await this.persist();
    return memoryState.event;
  }

  public static async setLeaderboardPublic(isPublic: boolean): Promise<EventRecord> {
    memoryState.event.leaderboard_public = isPublic;
    memoryState.event.updated_at = new Date().toISOString();
    await this.recordAudit("admin", "LEADERBOARD_VISIBILITY_CHANGE", { isPublic });
    await this.persist();
    return memoryState.event;
  }

  // TEAMS
  public static getAllTeams(): TeamRecord[] {
    return [...memoryState.teams];
  }

  public static getApprovedTeams(): TeamRecord[] {
    return memoryState.teams.filter((t) => t.status === "APPROVED");
  }

  public static getTeamById(id: string): TeamRecord | null {
    return memoryState.teams.find((t) => t.id === id) || null;
  }

  public static getTeamByCode(code: string): TeamRecord | null {
    const clean = code.trim().toUpperCase();
    return memoryState.teams.find((t) => t.code.toUpperCase() === clean) || null;
  }

  public static getTeamByEmail(email: string): TeamRecord | null {
    const clean = email.trim().toLowerCase();
    return memoryState.teams.find((t) => t.leader_email.toLowerCase() === clean) || null;
  }

  public static async registerTeam(data: {
    name: string;
    leader_name: string;
    leader_email: string;
    contact?: string;
    description?: string;
    password: string;
    members?: Array<{ name: string; role?: string; email?: string }>;
  }): Promise<{ team: TeamRecord; rawPassword: string }> {
    // Generate unique system ID: GWD-101, GWD-102...
    let code = `GWD-${memoryState.nextTeamSeq}`;
    while (memoryState.teams.some((t) => t.code === code)) {
      memoryState.nextTeamSeq += 1;
      code = `GWD-${memoryState.nextTeamSeq}`;
    }
    memoryState.nextTeamSeq += 1;

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(data.password, salt);

    const members: TeamMember[] = [
      {
        id: crypto.randomUUID(),
        name: data.leader_name.trim(),
        role: "Team Leader",
        email: data.leader_email.trim(),
      },
    ];

    if (Array.isArray(data.members)) {
      data.members.forEach((m) => {
        if (m.name && m.name.trim() && m.name.trim() !== data.leader_name.trim()) {
          members.push({
            id: crypto.randomUUID(),
            name: m.name.trim(),
            role: m.role?.trim() || "Member",
            email: m.email?.trim() || "",
          });
        }
      });
    }

    const newTeam: TeamRecord = {
      id: crypto.randomUUID(),
      code,
      name: data.name.trim(),
      leader_name: data.leader_name.trim(),
      leader_email: data.leader_email.trim().toLowerCase(),
      contact: data.contact?.trim() || "",
      description: data.description?.trim() || "",
      password_hash,
      status: "PENDING",
      admin_feedback: null,
      members,
      registered_at: new Date().toISOString(),
      approved_at: null,
      submitted_at: null,
    };

    memoryState.teams.push(newTeam);
    await this.recordAudit(code, "TEAM_REGISTRATION", { teamName: newTeam.name, teamCode: code });
    await this.persist();

    return { team: newTeam, rawPassword: data.password };
  }

  public static async updateTeamReview(
    teamId: string,
    action: "APPROVE" | "REQUEST_CHANGES" | "REJECT",
    feedback?: string
  ): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;

    if (action === "APPROVE") {
      team.status = "APPROVED";
      team.approved_at = new Date().toISOString();
      team.admin_feedback = null;
    } else if (action === "REQUEST_CHANGES") {
      team.status = "CHANGES_REQUESTED";
      team.admin_feedback = feedback?.trim() || "Please update your team details.";
    } else if (action === "REJECT") {
      team.status = "REJECTED";
      team.admin_feedback = feedback?.trim() || "Registration was not approved.";
    }

    await this.recordAudit("admin", `REVIEW_${action}`, { teamId, teamCode: team.code, teamName: team.name, feedback });
    await this.persist();
    return team;
  }

  public static async updateTeamDetails(
    teamId: string,
    data: {
      name?: string;
      leader_name?: string;
      contact?: string;
      description?: string;
      members?: Array<{ name: string; role?: string; email?: string }>;
    }
  ): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;

    if (data.name) team.name = data.name.trim();
    if (data.leader_name) team.leader_name = data.leader_name.trim();
    if (data.contact !== undefined) team.contact = data.contact.trim();
    if (data.description !== undefined) team.description = data.description.trim();

    if (data.members && Array.isArray(data.members)) {
      team.members = data.members.map((m) => ({
        id: crypto.randomUUID(),
        name: m.name.trim(),
        role: m.role?.trim() || "Member",
        email: m.email?.trim() || "",
      }));
    }

    // If changes were requested, return to pending for review
    if (team.status === "CHANGES_REQUESTED") {
      team.status = "PENDING";
    }

    await this.recordAudit(team.code, "TEAM_DETAILS_UPDATED", { teamName: team.name });
    await this.persist();
    return team;
  }

  // RATINGS
  public static getRatingsByRater(raterTeamId: string): RatingRecord[] {
    return memoryState.ratings.filter((r) => r.rater_team_id === raterTeamId);
  }

  public static getAllRatings(): RatingRecord[] {
    return [...memoryState.ratings];
  }

  public static async saveDraftRating(raterTeamId: string, targetTeamId: string, score: number): Promise<RatingRecord> {
    const existingIndex = memoryState.ratings.findIndex(
      (r) => r.rater_team_id === raterTeamId && r.target_team_id === targetTeamId
    );

    if (existingIndex >= 0) {
      memoryState.ratings[existingIndex].score = score;
      memoryState.ratings[existingIndex].updated_at = new Date().toISOString();
      await this.persist();
      return memoryState.ratings[existingIndex];
    } else {
      const record: RatingRecord = {
        id: crypto.randomUUID(),
        rater_team_id: raterTeamId,
        target_team_id: targetTeamId,
        score,
        updated_at: new Date().toISOString(),
      };
      memoryState.ratings.push(record);
      await this.persist();
      return record;
    }
  }

  public static async submitFinalBallot(raterTeamId: string): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === raterTeamId);
    if (!team) return null;

    team.submitted_at = new Date().toISOString();
    await this.recordAudit(team.code, "BALLOT_SUBMITTED", { teamName: team.name });
    await this.persist();
    return team;
  }

  // ANNOUNCEMENTS
  public static getAnnouncements(): AnnouncementRecord[] {
    return [...memoryState.announcements].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  public static async createAnnouncement(title: string, content: string, is_pinned: boolean = false): Promise<AnnouncementRecord> {
    const record: AnnouncementRecord = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      is_pinned,
      created_at: new Date().toISOString(),
    };
    memoryState.announcements.unshift(record);
    await this.recordAudit("admin", "CREATE_ANNOUNCEMENT", { title: record.title });
    await this.persist();
    return record;
  }

  public static async togglePinAnnouncement(id: string): Promise<AnnouncementRecord | null> {
    const item = memoryState.announcements.find((a) => a.id === id);
    if (!item) return null;
    item.is_pinned = !item.is_pinned;
    await this.persist();
    return item;
  }

  public static async deleteAnnouncement(id: string): Promise<boolean> {
    const idx = memoryState.announcements.findIndex((a) => a.id === id);
    if (idx < 0) return false;
    const removed = memoryState.announcements.splice(idx, 1)[0];
    await this.recordAudit("admin", "DELETE_ANNOUNCEMENT", { title: removed.title });
    await this.persist();
    return true;
  }

  // DISCUSSIONS
  public static getDiscussions(): DiscussionRecord[] {
    return [...memoryState.discussions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public static async addDiscussionMessage(
    teamId: string,
    teamName: string,
    authorName: string,
    content: string
  ): Promise<DiscussionRecord> {
    const record: DiscussionRecord = {
      id: crypto.randomUUID(),
      team_id: teamId,
      team_name: teamName,
      author_name: authorName.trim(),
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    memoryState.discussions.unshift(record);
    await this.persist();
    return record;
  }

  public static async deleteDiscussionMessage(id: string): Promise<boolean> {
    const idx = memoryState.discussions.findIndex((d) => d.id === id);
    if (idx < 0) return false;
    memoryState.discussions.splice(idx, 1);
    await this.recordAudit("admin", "MODERATE_DISCUSSION", { messageId: id });
    await this.persist();
    return true;
  }

  // AUDIT LOG
  public static getAudits(): AuditRecord[] {
    return [...memoryState.audits].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public static async recordAudit(actor: string, action: string, details?: Record<string, any>): Promise<void> {
    const audit: AuditRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
    };
    memoryState.audits.unshift(audit);
    // Keep last 500 audit logs
    if (memoryState.audits.length > 500) {
      memoryState.audits = memoryState.audits.slice(0, 500);
    }
  }
}
