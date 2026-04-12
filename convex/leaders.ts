import {
  query,
  mutation,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// Tracked fields — string-valued fields Open States provides
// ---------------------------------------------------------------------------
const TRACKED_FIELDS = [
  "firstName",
  "lastName",
  "fullName",
  "chamber",
  "district",
  "party",
  "title",
  "photoUrl",
  "email",
  "website",
  "birthday",
] as const;
type TrackedField = (typeof TRACKED_FIELDS)[number];

// ---------------------------------------------------------------------------
// Internal: upsert a single federal leader (called from civicSync action)
// ---------------------------------------------------------------------------
export const upsertFederalLeader = internalMutation({
  args: {
    externalId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    fullName: v.string(),
    state: v.string(),
    chamber: v.string(),
    office: v.string(),
    party: v.optional(v.string()),
    district: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    email: v.optional(v.string()),
    branch: v.string(),
    level: v.string(),
    source: v.string(),
    inOffice: v.boolean(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("leaders")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existing) {
      await ctx.db.insert("leaders", args);
      return "new";
    }
    await ctx.db.patch(existing._id, args);
    return "updated";
  },
});

// ---------------------------------------------------------------------------
// Internal: batch upsert leaders (called from sync action)
// ---------------------------------------------------------------------------
export const batchUpsertLeaders = internalMutation({
  args: {
    leaders: v.array(
      v.object({
        externalId: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        fullName: v.string(),
        state: v.string(),
        chamber: v.string(),
        district: v.optional(v.string()),
        party: v.optional(v.string()),
        title: v.optional(v.string()),
        photoUrl: v.optional(v.string()),
        email: v.optional(v.string()),
        website: v.optional(v.string()),
        birthday: v.optional(v.string()),
        level: v.string(),
        branch: v.string(),
        inOffice: v.boolean(),
        lastSyncedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const now = Date.now();

    for (const leaderData of args.leaders) {
      const existing = await ctx.db
        .query("leaders")
        .withIndex("by_external_id", (q) =>
          q.eq("externalId", leaderData.externalId)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("leaders", leaderData);
        newCount++;
        continue;
      }

      // Detect changed fields and create change records
      const changedFields: string[] = [];
      for (const field of TRACKED_FIELDS) {
        const oldVal = existing[field as keyof Doc<"leaders">] as
          | string
          | undefined;
        const newVal = leaderData[field as keyof typeof leaderData] as
          | string
          | undefined;
        const oldStr = oldVal ?? "";
        const newStr = newVal ?? "";
        if (oldStr !== newStr) {
          await ctx.db.insert("leader_changes", {
            leaderId: existing._id,
            field,
            oldValue: oldVal,
            newValue: newStr,
            source: "open_states",
            confidence: "high",
            status: "pending",
            detectedAt: now,
          });
          changedFields.push(field);
        }
      }

      await ctx.db.patch(existing._id, { ...leaderData });

      if (changedFields.length > 0) {
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    return { new: newCount, updated: updatedCount, unchanged: unchangedCount };
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getLeaderCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const leaders = await ctx.db.query("leaders").take(10000);
    return leaders.length;
  },
});

export const getLeaderCountByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const leaders = await ctx.db
      .query("leaders")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .take(500);
    return leaders.length;
  },
});

export const getPendingChangesCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const changes = await ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(1000);
    return changes.length;
  },
});

export const listLeadersByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    return ctx.db
      .query("leaders")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .take(500);
  },
});

export const getLeader = query({
  args: { leaderId: v.id("leaders") },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    return ctx.db.get(args.leaderId);
  },
});

export const listPendingChangesWithLeaders = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const changes = await ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(500);

    // Deduplicate leader IDs and batch-fetch
    const leaderIdSet = new Set(changes.map((c) => c.leaderId as string));
    const leaderDocs = await Promise.all(
      [...leaderIdSet].map((id) => ctx.db.get(id as Id<"leaders">))
    );
    const leaderMap = new Map(
      leaderDocs.filter(Boolean).map((l) => [l!._id as string, l!])
    );

    return changes.map((c) => ({
      change: c,
      leader: leaderMap.get(c.leaderId as string) ?? null,
    }));
  },
});

export const listPendingChanges = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    return ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(500);
  },
});

export const listPendingChangesByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const changes = await ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(1000);

    const leaderIdSet = new Set(changes.map((c) => c.leaderId as string));
    const leaderDocs = await Promise.all(
      [...leaderIdSet].map((id) => ctx.db.get(id as Id<"leaders">))
    );
    const leaderMap = new Map(
      leaderDocs.filter(Boolean).map((l) => [l!._id as string, l!])
    );

    return changes
      .filter((c) => {
        const leader = leaderMap.get(c.leaderId as string);
        return leader?.state === args.state;
      })
      .map((c) => ({
        change: c,
        leader: leaderMap.get(c.leaderId as string) ?? null,
      }));
  },
});

export const getChangeStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const pending = await ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(5000);
    const approved = await ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .take(5000);
    const denied = await ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "denied"))
      .take(5000);

    const allLeaderIds = new Set([
      ...pending.map((c) => c.leaderId as string),
      ...approved.map((c) => c.leaderId as string),
      ...denied.map((c) => c.leaderId as string),
    ]);

    const leaderDocs = await Promise.all(
      [...allLeaderIds].map((id) => ctx.db.get(id as Id<"leaders">))
    );
    const leaderStateMap = new Map(
      leaderDocs.filter(Boolean).map((l) => [l!._id as string, l!.state])
    );

    const stats: Record<
      string,
      { pending: number; approved: number; denied: number }
    > = {};

    const bump = (
      state: string,
      key: "pending" | "approved" | "denied"
    ) => {
      stats[state] = stats[state] ?? { pending: 0, approved: 0, denied: 0 };
      stats[state][key]++;
    };

    for (const c of pending)
      bump(leaderStateMap.get(c.leaderId as string) ?? "unknown", "pending");
    for (const c of approved)
      bump(leaderStateMap.get(c.leaderId as string) ?? "unknown", "approved");
    for (const c of denied)
      bump(leaderStateMap.get(c.leaderId as string) ?? "unknown", "denied");

    return stats;
  },
});

export const getStatesStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const leaders = await ctx.db.query("leaders").take(10000);
    const pendingChanges = await ctx.db
      .query("leader_changes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(5000);

    const leadersByState: Record<string, number> = {};
    for (const l of leaders) {
      leadersByState[l.state] = (leadersByState[l.state] ?? 0) + 1;
    }

    const leaderStateMap = new Map(
      leaders.map((l) => [l._id as string, l.state])
    );

    const changesByState: Record<string, number> = {};
    for (const c of pendingChanges) {
      const state = leaderStateMap.get(c.leaderId as string);
      if (state) {
        changesByState[state] = (changesByState[state] ?? 0) + 1;
      }
    }

    return { leadersByState, changesByState };
  },
});

export const listLegislativeLeadersByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    return ctx.db
      .query("leaders")
      .withIndex("by_state_and_branch", (q) =>
        q.eq("state", args.state).eq("branch", "legislative")
      )
      .take(500);
  },
});

export const listFederalLeadersByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    return ctx.db
      .query("leaders")
      .withIndex("by_state_and_branch", (q) =>
        q.eq("state", args.state).eq("branch", "federal_legislative")
      )
      .take(100);
  },
});

export const getLeaderBranchStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const leaders = await ctx.db.query("leaders").take(10000);
    const stats = { legislative: 0, executive: 0, federal_legislative: 0, judicial: 0 };
    for (const l of leaders) {
      if (l.branch === "legislative") stats.legislative++;
      else if (l.branch === "executive") stats.executive++;
      else if (l.branch === "federal_legislative") stats.federal_legislative++;
      else if (l.branch === "judicial") stats.judicial++;
    }
    return stats;
  },
});

export const searchLeaders = query({
  args: {
    searchTerm: v.string(),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    if (!args.searchTerm.trim()) return [];
    return ctx.db
      .query("leaders")
      .withSearchIndex("search_name", (q) => {
        const base = q.search("fullName", args.searchTerm);
        return args.state ? base.eq("state", args.state) : base;
      })
      .take(30);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const approveChange = mutation({
  args: { changeId: v.id("leader_changes") },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const change = await ctx.db.get(args.changeId);
    if (!change) throw new Error("Change not found");
    if (change.status !== "pending") return;

    await ctx.db.patch(change.leaderId, {
      [change.field]: change.newValue || undefined,
    } as Partial<Doc<"leaders">>);

    await ctx.db.patch(args.changeId, {
      status: "approved",
      reviewedAt: Date.now(),
    });
  },
});

export const denyChange = mutation({
  args: { changeId: v.id("leader_changes") },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const change = await ctx.db.get(args.changeId);
    if (!change) throw new Error("Change not found");
    await ctx.db.patch(args.changeId, {
      status: "denied",
      reviewedAt: Date.now(),
    });
  },
});

export const flagChange = mutation({
  args: { changeId: v.id("leader_changes") },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const change = await ctx.db.get(args.changeId);
    if (!change) throw new Error("Change not found");
    await ctx.db.patch(args.changeId, { status: "flagged" });
  },
});

export const editAndApprove = mutation({
  args: {
    changeId: v.id("leader_changes"),
    editedValue: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const change = await ctx.db.get(args.changeId);
    if (!change) throw new Error("Change not found");

    await ctx.db.patch(change.leaderId, {
      [change.field]: args.editedValue || undefined,
    } as Partial<Doc<"leaders">>);

    await ctx.db.patch(args.changeId, {
      newValue: args.editedValue,
      status: "approved",
      reviewedAt: Date.now(),
    });
  },
});

export const bulkApproveHighConfidence = mutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const leaders = await ctx.db
      .query("leaders")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .take(500);

    const now = Date.now();
    let count = 0;

    for (const leader of leaders) {
      const changes = await ctx.db
        .query("leader_changes")
        .withIndex("by_leader_and_status", (q) =>
          q.eq("leaderId", leader._id).eq("status", "pending")
        )
        .take(100);

      const highConf = changes.filter((c) => c.confidence === "high");

      for (const change of highConf) {
        await ctx.db.patch(change.leaderId, {
          [change.field]: change.newValue || undefined,
        } as Partial<Doc<"leaders">>);
        await ctx.db.patch(change._id, { status: "approved", reviewedAt: now });
        count++;
      }
    }

    return count;
  },
});

// Editable fields for manual updates
const MANUAL_FIELDS = [
  "firstName", "lastName", "fullName", "title", "party", "district",
  "email", "phone", "website", "birthday", "birthplace", "spouse",
  "children", "bio", "photoUrl",
] as const;

export const updateLeader = mutation({
  args: {
    leaderId: v.id("leaders"),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      fullName: v.optional(v.string()),
      title: v.optional(v.string()),
      party: v.optional(v.string()),
      district: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      website: v.optional(v.string()),
      birthday: v.optional(v.string()),
      birthplace: v.optional(v.string()),
      spouse: v.optional(v.string()),
      children: v.optional(v.string()),
      bio: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const leader = await ctx.db.get(args.leaderId);
    if (!leader) throw new Error("Leader not found");

    const now = Date.now();
    const patch: Partial<Doc<"leaders">> = { lastVerifiedAt: now };

    for (const field of MANUAL_FIELDS) {
      if (!(field in args.updates)) continue;
      const newVal = args.updates[field] as string | undefined;
      const oldVal = leader[field as keyof Doc<"leaders">] as string | undefined;
      const oldStr = oldVal ?? "";
      const newStr = newVal ?? "";

      // Apply change regardless; create audit record only if value changed
      patch[field as keyof typeof patch] = (newStr || undefined) as never;

      if (oldStr !== newStr) {
        await ctx.db.insert("leader_changes", {
          leaderId: args.leaderId,
          field,
          oldValue: oldVal,
          newValue: newStr,
          source: "manual",
          confidence: "high",
          status: "approved",
          reviewedAt: now,
          detectedAt: now,
        });
      }
    }

    await ctx.db.patch(args.leaderId, patch);
  },
});
