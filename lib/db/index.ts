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
  event_id: string; // Strictly scoped to an event
  code: string; // Unique system-generated ID within event: e.g. GWD-101
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
  event_id: string; // Strictly scoped to an event
  rater_team_id: string;
  target_team_id: string;
  score: number;
  updated_at: string;
}

export interface AnnouncementRecord {
  id: string;
  event_id: string; // Strictly scoped to an event
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export interface DiscussionRecord {
  id: string;
  event_id: string; // Strictly scoped to an event
  team_id: string;
  team_name: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  event_id?: string;
  timestamp: string;
  actor: string;
  action: string;
  details?: Record<string, any>;
}

export type LeaderboardVisibility = "HIDDEN" | "MEMBERS_ONLY" | "PUBLIC" | "FINAL";

export interface EventRecord {
  id: string;
  name: string;
  description?: string;
  status: EventStatus;
  previous_status?: EventStatus | null;
  leaderboard_public: boolean;
  leaderboard_visibility: LeaderboardVisibility;
  max_tens: number;
  discussion_enabled: boolean;
  announcements_enabled: boolean;
  allow_member_edits: boolean;
  registration_start?: string;
  registration_end?: string;
  voting_start?: string;
  voting_end?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface DatabaseState {
  events: EventRecord[];
  activeEventId: string;
  teams: TeamRecord[];
  ratings: RatingRecord[];
  announcements: AnnouncementRecord[];
  discussions: DiscussionRecord[];
  audits: AuditRecord[];
}

const DEFAULT_EVENT_ID = "gwd-annual-2026";

const DEFAULT_STATE: DatabaseState = {
  events: [
    {
      id: DEFAULT_EVENT_ID,
      name: "GWD Team Hackathon & Showcase",
      description: "Annual peer review, rating, and pre-deployment showcase platform.",
      status: "DRAFT",
      previous_status: null,
      leaderboard_public: false,
      leaderboard_visibility: "PUBLIC",
      max_tens: 5,
      discussion_enabled: true,
      announcements_enabled: true,
      allow_member_edits: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    },
  ],
  activeEventId: DEFAULT_EVENT_ID,
  teams: [],
  ratings: [],
  announcements: [],
  discussions: [],
  audits: [],
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
          const remote = await loadStateFromMongo<any>();
          if (remote) {
            // Migration handling: if older single-event format exists in Mongo, convert to multi-event cleanly
            let eventsList: EventRecord[] = [];
            let activeId = DEFAULT_EVENT_ID;

            if (Array.isArray(remote.events) && remote.events.length > 0) {
              eventsList = remote.events.map((ev: any) => ({
                ...ev,
                previous_status: ev.previous_status || null,
                discussion_enabled: ev.discussion_enabled !== false,
                announcements_enabled: ev.announcements_enabled !== false,
                allow_member_edits: ev.allow_member_edits !== false,
                leaderboard_visibility: ev.leaderboard_visibility || (ev.leaderboard_public ? "PUBLIC" : "HIDDEN"),
              }));
              activeId = remote.activeEventId || remote.events[0].id;
            } else if (remote.event) {
              eventsList = [{
                id: remote.event.id || DEFAULT_EVENT_ID,
                name: remote.event.name || "GWD Team Hackathon & Showcase",
                description: remote.event.description || "",
                status: remote.event.status || "DRAFT",
                previous_status: null,
                leaderboard_public: Boolean(remote.event.leaderboard_public),
                leaderboard_visibility: "PUBLIC",
                max_tens: typeof remote.event.max_tens === "number" ? remote.event.max_tens : 5,
                discussion_enabled: true,
                announcements_enabled: true,
                allow_member_edits: true,
                created_at: remote.event.created_at || new Date().toISOString(),
                updated_at: remote.event.updated_at || new Date().toISOString(),
                archived_at: null,
              }];
              activeId = eventsList[0].id;
            } else {
              eventsList = DEFAULT_STATE.events;
            }

            // Ensure event_id is set on all child items
            const defaultEvId = eventsList[0]?.id || DEFAULT_EVENT_ID;

            const teams = Array.isArray(remote.teams)
              ? remote.teams.map((t: any) => ({ ...t, event_id: t.event_id || defaultEvId }))
              : [];
            const ratings = Array.isArray(remote.ratings)
              ? remote.ratings.map((r: any) => ({ ...r, event_id: r.event_id || defaultEvId }))
              : [];
            const announcements = Array.isArray(remote.announcements)
              ? remote.announcements.map((a: any) => ({ ...a, event_id: a.event_id || defaultEvId }))
              : [];
            const discussions = Array.isArray(remote.discussions)
              ? remote.discussions.map((d: any) => ({ ...d, event_id: d.event_id || defaultEvId }))
              : [];
            const audits = Array.isArray(remote.audits)
              ? remote.audits.map((au: any) => ({ ...au, event_id: au.event_id || defaultEvId }))
              : [];

            memoryState = {
              events: eventsList,
              activeEventId: activeId,
              teams,
              ratings,
              announcements,
              discussions,
              audits,
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

  // ==========================================
  // EVENT LIFECYCLE & MULTI-EVENT MANAGEMENT
  // ==========================================

  public static getAllEvents(): EventRecord[] {
    return [...memoryState.events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public static getActiveEventId(): string {
    return memoryState.activeEventId || memoryState.events[0]?.id || DEFAULT_EVENT_ID;
  }

  public static async setActiveEventId(id: string): Promise<EventRecord | null> {
    const found = memoryState.events.find((e) => e.id === id);
    if (!found) return null;
    memoryState.activeEventId = id;
    await this.persist();
    return found;
  }

  public static getEvent(id?: string): EventRecord | null {
    const targetId = id || this.getActiveEventId();
    return memoryState.events.find((e) => e.id === targetId) || memoryState.events[0] || null;
  }

  public static async createEvent(data: {
    name: string;
    description?: string;
    max_tens?: number;
    leaderboard_public?: boolean;
    registration_start?: string;
    registration_end?: string;
    voting_start?: string;
    voting_end?: string;
  }): Promise<EventRecord> {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    let id = `${slug || "gwd-event"}-${Date.now().toString().slice(-4)}`;

    // Ensure unique ID
    let counter = 1;
    while (memoryState.events.some((e) => e.id === id)) {
      id = `${slug}-${counter}`;
      counter++;
    }

    const newEvent: EventRecord = {
      id,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      status: "DRAFT",
      previous_status: null,
      leaderboard_public: Boolean(data.leaderboard_public),
      leaderboard_visibility: data.leaderboard_public ? "PUBLIC" : "HIDDEN",
      max_tens: typeof data.max_tens === "number" && data.max_tens > 0 ? data.max_tens : 5,
      discussion_enabled: true,
      announcements_enabled: true,
      allow_member_edits: true,
      registration_start: data.registration_start || undefined,
      registration_end: data.registration_end || undefined,
      voting_start: data.voting_start || undefined,
      voting_end: data.voting_end || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };

    memoryState.events.unshift(newEvent);
    memoryState.activeEventId = newEvent.id;

    await this.recordAudit("admin", "EVENT_CREATED", {
      eventId: newEvent.id,
      name: newEvent.name,
    }, newEvent.id);

    await this.persist();
    return newEvent;
  }

  /**
   * Duplicates configuration ONLY from an existing event.
   * NEVER copies teams, ratings, ballots, discussions, announcements, or audits!
   */
  public static async duplicateEventSettings(sourceEventId: string, customName?: string): Promise<EventRecord | null> {
    const source = this.getEvent(sourceEventId);
    if (!source) return null;

    const baseName = customName?.trim() || `${source.name} (Copy)`;
    const newEvent = await this.createEvent({
      name: baseName,
      description: source.description,
      max_tens: source.max_tens,
      leaderboard_public: source.leaderboard_public,
    });

    await this.recordAudit("admin", "EVENT_SETTINGS_DUPLICATED", {
      sourceEventId,
      newEventId: newEvent.id,
      name: newEvent.name,
    }, newEvent.id);

    return newEvent;
  }

  public static async updateEventSettings(
    eventId: string,
    settings: {
      name?: string;
      description?: string;
      max_tens?: number;
      leaderboard_public?: boolean;
      leaderboard_visibility?: LeaderboardVisibility;
      discussion_enabled?: boolean;
      announcements_enabled?: boolean;
      allow_member_edits?: boolean;
      registration_start?: string;
      registration_end?: string;
      voting_start?: string;
      voting_end?: string;
    }
  ): Promise<EventRecord | null> {
    const event = memoryState.events.find((e) => e.id === eventId);
    if (!event) return null;
    if (event.status === "ARCHIVED") {
      throw new Error("Archived events cannot be modified.");
    }

    if (settings.name && settings.name.trim()) event.name = settings.name.trim();
    if (settings.description !== undefined) event.description = settings.description.trim();
    if (typeof settings.max_tens === "number" && settings.max_tens > 0) event.max_tens = settings.max_tens;
    if (typeof settings.leaderboard_public === "boolean") event.leaderboard_public = settings.leaderboard_public;
    if (settings.leaderboard_visibility) event.leaderboard_visibility = settings.leaderboard_visibility;
    if (typeof settings.discussion_enabled === "boolean") event.discussion_enabled = settings.discussion_enabled;
    if (typeof settings.announcements_enabled === "boolean") event.announcements_enabled = settings.announcements_enabled;
    if (typeof settings.allow_member_edits === "boolean") event.allow_member_edits = settings.allow_member_edits;
    if (settings.registration_start !== undefined) event.registration_start = settings.registration_start || undefined;
    if (settings.registration_end !== undefined) event.registration_end = settings.registration_end || undefined;
    if (settings.voting_start !== undefined) event.voting_start = settings.voting_start || undefined;
    if (settings.voting_end !== undefined) event.voting_end = settings.voting_end || undefined;

    event.updated_at = new Date().toISOString();

    await this.recordAudit("admin", "EVENT_SETTINGS_UPDATED", {
      eventId,
      updatedFields: Object.keys(settings),
    }, eventId);

    await this.persist();
    return event;
  }

  public static async deactivateEvent(eventId: string, reason?: string): Promise<EventRecord | null> {
    const event = memoryState.events.find((e) => e.id === eventId);
    if (!event) return null;
    if (event.status === "ARCHIVED") {
      throw new Error("Archived events cannot be deactivated.");
    }
    if (event.status === "DEACTIVATED") {
      return event;
    }

    event.previous_status = event.status;
    event.status = "DEACTIVATED";
    event.updated_at = new Date().toISOString();

    await this.recordAudit("admin", "EVENT_DEACTIVATED", {
      eventId,
      reason: reason?.trim() || "Event deactivated by administrator",
      previousStatus: event.previous_status,
    }, eventId);

    await this.persist();
    return event;
  }

  public static async reactivateEvent(eventId: string): Promise<EventRecord | null> {
    const event = memoryState.events.find((e) => e.id === eventId);
    if (!event) return null;
    if (event.status !== "DEACTIVATED") {
      throw new Error("Only deactivated events can be reactivated.");
    }

    const restoredStatus = event.previous_status || "DRAFT";
    event.status = restoredStatus;
    event.previous_status = null;
    event.updated_at = new Date().toISOString();

    await this.recordAudit("admin", "EVENT_REACTIVATED", {
      eventId,
      restoredStatus,
    }, eventId);

    await this.persist();
    return event;
  }

  public static async updateEventStatus(eventId: string, nextStatus: EventStatus): Promise<EventRecord | null> {
    const event = memoryState.events.find((e) => e.id === eventId);
    if (!event) return null;

    // Prevent modification of archived events
    if (event.status === "ARCHIVED" && nextStatus !== "ARCHIVED") {
      throw new Error("This event is archived and cannot be modified.");
    }

    event.status = nextStatus;
    event.updated_at = new Date().toISOString();
    if (nextStatus === "ARCHIVED") {
      event.archived_at = new Date().toISOString();
    }

    await this.recordAudit("admin", "EVENT_STATUS_CHANGE", {
      eventId,
      nextStatus,
    }, eventId);

    await this.persist();
    return event;
  }

  public static async setLeaderboardPublic(eventId: string, isPublic: boolean): Promise<EventRecord | null> {
    const event = memoryState.events.find((e) => e.id === eventId);
    if (!event) return null;

    event.leaderboard_public = isPublic;
    event.leaderboard_visibility = isPublic ? "PUBLIC" : "HIDDEN";
    event.updated_at = new Date().toISOString();

    await this.recordAudit("admin", "LEADERBOARD_VISIBILITY_CHANGE", {
      eventId,
      isPublic,
    }, eventId);

    await this.persist();
    return event;
  }

  // ==========================================
  // TEAMS (STRICTLY SCOPED BY EVENT ID)
  // ==========================================

  public static getAllTeams(eventId?: string): TeamRecord[] {
    const targetEvId = eventId || this.getActiveEventId();
    return memoryState.teams.filter((t) => t.event_id === targetEvId);
  }

  public static getApprovedTeams(eventId?: string): TeamRecord[] {
    const targetEvId = eventId || this.getActiveEventId();
    return memoryState.teams.filter((t) => t.event_id === targetEvId && t.status === "APPROVED");
  }

  public static getTeamById(id: string): TeamRecord | null {
    return memoryState.teams.find((t) => t.id === id) || null;
  }

  public static getTeamByCode(eventId: string, code: string): TeamRecord | null {
    const clean = code.trim().toUpperCase();
    return (
      memoryState.teams.find(
        (t) => t.event_id === eventId && t.code.toUpperCase() === clean
      ) || null
    );
  }

  public static getTeamByEmail(eventId: string, email: string): TeamRecord | null {
    const clean = email.trim().toLowerCase();
    return (
      memoryState.teams.find(
        (t) => t.event_id === eventId && t.leader_email.toLowerCase() === clean
      ) || null
    );
  }

  public static async registerTeam(
    eventId: string,
    data: {
      name: string;
      leader_name: string;
      leader_email: string;
      contact?: string;
      description?: string;
      password: string;
      members?: Array<{ name: string; role?: string; email?: string }>;
    }
  ): Promise<{ team: TeamRecord; rawPassword: string }> {
    const event = this.getEvent(eventId);
    if (!event) {
      throw new Error("Event not found.");
    }
    if (event.status !== "REGISTRATION_OPEN") {
      throw new Error("Registration is not currently open for this event.");
    }

    // Generate unique sequential Team ID within this specific event (GWD-101, GWD-102...)
    const eventTeams = memoryState.teams.filter((t) => t.event_id === eventId);
    let seq = 101 + eventTeams.length;
    let code = `GWD-${seq}`;
    while (eventTeams.some((t) => t.code === code)) {
      seq += 1;
      code = `GWD-${seq}`;
    }

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
      event_id: eventId,
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

    await this.recordAudit(
      code,
      "TEAM_REGISTRATION",
      { eventId, teamName: newTeam.name, teamCode: code },
      eventId
    );

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

    await this.recordAudit(
      "admin",
      `REVIEW_${action}`,
      { teamId, teamCode: team.code, teamName: team.name, feedback, eventId: team.event_id },
      team.event_id
    );

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

    if (team.status === "CHANGES_REQUESTED") {
      team.status = "PENDING";
    }

    await this.recordAudit(
      team.code,
      "TEAM_DETAILS_UPDATED",
      { teamName: team.name, eventId: team.event_id },
      team.event_id
    );

    await this.persist();
    return team;
  }

  public static async unlockTeamBallot(
    teamId: string,
    adminEmail: string,
    reason: string
  ): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;

    const prev = team.submitted_at;
    team.submitted_at = null;

    await this.recordAudit(
      "admin",
      "BALLOT_UNLOCKED",
      {
        administrator: adminEmail,
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        reason: reason.trim(),
        previousState: `SUBMITTED (${prev})`,
        newState: "UNLOCKED",
        eventId: team.event_id,
      },
      team.event_id
    );

    await this.persist();
    return team;
  }

  public static async resetTeamBallot(
    teamId: string,
    adminEmail: string,
    reason: string
  ): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;

    // Remove all ratings cast by this team for this event
    memoryState.ratings = memoryState.ratings.filter(
      (r) => !(r.event_id === team.event_id && r.rater_team_id === teamId)
    );

    const prev = team.submitted_at;
    team.submitted_at = null;

    await this.recordAudit(
      "admin",
      "BALLOT_RESET",
      {
        administrator: adminEmail,
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        reason: reason.trim(),
        previousSubmission: prev,
        eventId: team.event_id,
      },
      team.event_id
    );

    await this.persist();
    return team;
  }

  public static async withdrawTeam(teamId: string): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;

    team.status = "WITHDRAWN";
    await this.recordAudit(
      team.code,
      "TEAM_WITHDRAWN",
      { teamName: team.name, eventId: team.event_id },
      team.event_id
    );

    await this.persist();
    return team;
  }

  public static async addTeamMember(
    teamId: string,
    member: { name: string; role?: string; email?: string }
  ): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;

    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: member.name.trim(),
      role: member.role?.trim() || "Member",
      email: member.email?.trim() || "",
    };

    team.members.push(newMember);

    await this.recordAudit(
      team.code,
      "TEAM_MEMBER_ADDED",
      { memberName: newMember.name, role: newMember.role, teamId, eventId: team.event_id },
      team.event_id
    );

    await this.persist();
    return team;
  }

  public static async removeTeamMember(
    teamId: string,
    memberId: string
  ): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === teamId);
    if (!team) return null;

    const idx = team.members.findIndex((m) => m.id === memberId);
    if (idx < 0) return null;

    const removed = team.members.splice(idx, 1)[0];

    await this.recordAudit(
      team.code,
      "TEAM_MEMBER_REMOVED",
      { memberName: removed.name, memberId, teamId, eventId: team.event_id },
      team.event_id
    );

    await this.persist();
    return team;
  }

  // ==========================================
  // RATINGS (STRICTLY SCOPED BY EVENT ID)
  // ==========================================

  public static getRatingsByRater(eventId: string, raterTeamId: string): RatingRecord[] {
    return memoryState.ratings.filter(
      (r) => r.event_id === eventId && r.rater_team_id === raterTeamId
    );
  }

  public static getAllRatings(eventId: string): RatingRecord[] {
    return memoryState.ratings.filter((r) => r.event_id === eventId);
  }

  public static async saveDraftRating(
    eventId: string,
    raterTeamId: string,
    targetTeamId: string,
    score: number
  ): Promise<RatingRecord> {
    const existingIndex = memoryState.ratings.findIndex(
      (r) =>
        r.event_id === eventId &&
        r.rater_team_id === raterTeamId &&
        r.target_team_id === targetTeamId
    );

    if (existingIndex >= 0) {
      memoryState.ratings[existingIndex].score = score;
      memoryState.ratings[existingIndex].updated_at = new Date().toISOString();
      await this.persist();
      return memoryState.ratings[existingIndex];
    } else {
      const record: RatingRecord = {
        id: crypto.randomUUID(),
        event_id: eventId,
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

  public static async submitFinalBallot(eventId: string, raterTeamId: string): Promise<TeamRecord | null> {
    const team = memoryState.teams.find((t) => t.id === raterTeamId && t.event_id === eventId);
    if (!team) return null;

    team.submitted_at = new Date().toISOString();

    await this.recordAudit(
      team.code,
      "BALLOT_SUBMITTED",
      { teamName: team.name, eventId },
      eventId
    );

    await this.persist();
    return team;
  }

  // ==========================================
  // ANNOUNCEMENTS (STRICTLY SCOPED BY EVENT ID)
  // ==========================================

  public static getAnnouncements(eventId: string): AnnouncementRecord[] {
    return memoryState.announcements
      .filter((a) => a.event_id === eventId)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }

  public static async createAnnouncement(
    eventId: string,
    title: string,
    content: string,
    is_pinned: boolean = false
  ): Promise<AnnouncementRecord> {
    const record: AnnouncementRecord = {
      id: crypto.randomUUID(),
      event_id: eventId,
      title: title.trim(),
      content: content.trim(),
      is_pinned,
      created_at: new Date().toISOString(),
    };
    memoryState.announcements.unshift(record);

    await this.recordAudit("admin", "CREATE_ANNOUNCEMENT", { title: record.title, eventId }, eventId);
    await this.persist();
    return record;
  }

  public static async editAnnouncement(
    eventId: string,
    id: string,
    title: string,
    content: string,
    is_pinned?: boolean
  ): Promise<AnnouncementRecord | null> {
    const item = memoryState.announcements.find((a) => a.id === id && a.event_id === eventId);
    if (!item) return null;
    item.title = title.trim();
    item.content = content.trim();
    if (typeof is_pinned === "boolean") item.is_pinned = is_pinned;
    await this.recordAudit("admin", "EDIT_ANNOUNCEMENT", { title: item.title, eventId }, eventId);
    await this.persist();
    return item;
  }

  public static async togglePinAnnouncement(eventId: string, id: string): Promise<AnnouncementRecord | null> {
    const item = memoryState.announcements.find((a) => a.id === id && a.event_id === eventId);
    if (!item) return null;
    item.is_pinned = !item.is_pinned;
    await this.persist();
    return item;
  }

  public static async deleteAnnouncement(eventId: string, id: string): Promise<boolean> {
    const idx = memoryState.announcements.findIndex((a) => a.id === id && a.event_id === eventId);
    if (idx < 0) return false;
    const removed = memoryState.announcements.splice(idx, 1)[0];
    await this.recordAudit("admin", "DELETE_ANNOUNCEMENT", { title: removed.title, eventId }, eventId);
    await this.persist();
    return true;
  }

  // ==========================================
  // DISCUSSIONS (STRICTLY SCOPED BY EVENT ID)
  // ==========================================

  public static getDiscussions(eventId: string): DiscussionRecord[] {
    return memoryState.discussions
      .filter((d) => d.event_id === eventId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public static async addDiscussionMessage(
    eventId: string,
    teamId: string,
    teamName: string,
    authorName: string,
    content: string
  ): Promise<DiscussionRecord> {
    const record: DiscussionRecord = {
      id: crypto.randomUUID(),
      event_id: eventId,
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

  public static async deleteDiscussionMessage(eventId: string, id: string): Promise<boolean> {
    const idx = memoryState.discussions.findIndex((d) => d.id === id && d.event_id === eventId);
    if (idx < 0) return false;
    memoryState.discussions.splice(idx, 1);
    await this.recordAudit("admin", "MODERATE_DISCUSSION", { messageId: id, eventId }, eventId);
    await this.persist();
    return true;
  }

  // ==========================================
  // AUDIT LOG (EVENT-SCOPED OR GLOBAL)
  // ==========================================

  public static getAudits(eventId?: string): AuditRecord[] {
    const list = eventId
      ? memoryState.audits.filter((a) => a.event_id === eventId)
      : memoryState.audits;
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public static async recordAudit(
    actor: string,
    action: string,
    details?: Record<string, any>,
    eventId?: string
  ): Promise<void> {
    const audit: AuditRecord = {
      id: crypto.randomUUID(),
      event_id: eventId,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
    };
    memoryState.audits.unshift(audit);
    if (memoryState.audits.length > 800) {
      memoryState.audits = memoryState.audits.slice(0, 800);
    }
  }
}
