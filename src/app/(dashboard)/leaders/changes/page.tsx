"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const STATE_NAMES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas",
  ca: "California", co: "Colorado", ct: "Connecticut", de: "Delaware",
  fl: "Florida", ga: "Georgia", hi: "Hawaii", id: "Idaho",
  il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas",
  ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi",
  mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada",
  nh: "New Hampshire", nj: "New Jersey", nm: "New Mexico", ny: "New York",
  nc: "North Carolina", nd: "North Dakota", oh: "Ohio", ok: "Oklahoma",
  or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah",
  vt: "Vermont", va: "Virginia", wa: "Washington", wv: "West Virginia",
  wi: "Wisconsin", wy: "Wyoming",
};

type ChangeWithLeader = {
  change: {
    _id: Id<"leader_changes">;
    leaderId: Id<"leaders">;
    field: string;
    oldValue?: string;
    newValue: string;
    source: string;
    confidence: string;
    status: string;
    detectedAt: number;
  };
  leader: {
    _id: Id<"leaders">;
    fullName: string;
    state: string;
    chamber: string;
    district?: string;
    party?: string;
  } | null;
};

function confidenceColor(confidence: string) {
  if (confidence === "high")
    return "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  if (confidence === "medium")
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300";
}

function formatField(field: string) {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function ChangeCard({ row }: { row: ChangeWithLeader }) {
  const [editing, setEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(row.change.newValue);
  const [pending, setPending] = useState<string | null>(null);

  const approveChange = useMutation(api.leaders.approveChange);
  const denyChange = useMutation(api.leaders.denyChange);
  const flagChange = useMutation(api.leaders.flagChange);
  const editAndApprove = useMutation(api.leaders.editAndApprove);

  const changeId = row.change._id;

  async function handleApprove() {
    setPending("approve");
    try {
      await approveChange({ changeId });
    } finally {
      setPending(null);
    }
  }

  async function handleDeny() {
    setPending("deny");
    try {
      await denyChange({ changeId });
    } finally {
      setPending(null);
    }
  }

  async function handleFlag() {
    setPending("flag");
    try {
      await flagChange({ changeId });
    } finally {
      setPending(null);
    }
  }

  async function handleEditApprove() {
    setPending("edit");
    try {
      await editAndApprove({ changeId, editedValue });
      setEditing(false);
    } finally {
      setPending(null);
    }
  }

  const leader = row.leader;
  const isLoading = pending !== null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {leader?.fullName ?? "Unknown Leader"}
          </p>
          {leader && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {STATE_NAMES[leader.state] ?? leader.state.toUpperCase()} ·{" "}
              {leader.chamber}{" "}
              {leader.district ? `· District ${leader.district}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${confidenceColor(
              row.change.confidence
            )}`}
          >
            {row.change.confidence}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {row.change.source}
          </span>
        </div>
      </div>

      {/* Field change */}
      <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          {formatField(row.change.field)}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400">
            {row.change.oldValue || "(empty)"}
          </span>
          <svg
            className="h-3.5 w-3.5 shrink-0 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
          {editing ? (
            <input
              type="text"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="rounded border border-gray-300 bg-white px-2 py-0.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100"
              autoFocus
            />
          ) : (
            <span className="rounded bg-green-50 px-2 py-0.5 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {row.change.newValue || "(empty)"}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button
              onClick={handleEditApprove}
              disabled={isLoading}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 dark:bg-green-500 dark:hover:bg-green-600"
            >
              {pending === "edit" ? "Saving…" : "Save & Approve"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditedValue(row.change.newValue);
              }}
              disabled={isLoading}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 dark:bg-green-500 dark:hover:bg-green-600"
            >
              {pending === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={handleDeny}
              disabled={isLoading}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {pending === "deny" ? "Denying…" : "Deny"}
            </button>
            <button
              onClick={handleFlag}
              disabled={isLoading}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {pending === "flag" ? "Flagging…" : "Flag"}
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={isLoading}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LeaderChangesPage() {
  const { isAuthenticated } = useConvexAuth();
  const rows = useQuery(
    api.leaders.listPendingChangesWithLeaders,
    isAuthenticated ? {} : "skip"
  );
  const bulkApprove = useMutation(api.leaders.bulkApproveHighConfidence);

  const [stateFilter, setStateFilter] = useState("all");
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // Derive unique states from loaded rows
  const availableStates = rows
    ? [...new Set(rows.map((r) => r.leader?.state).filter(Boolean))].sort()
    : [];

  const filtered =
    rows && stateFilter !== "all"
      ? rows.filter((r) => r.leader?.state === stateFilter)
      : rows;

  async function handleBulkApprove() {
    if (stateFilter === "all") return;
    setBulkPending(true);
    setBulkResult(null);
    try {
      const count = await bulkApprove({ state: stateFilter });
      setBulkResult(`Approved ${count} high-confidence changes`);
      setTimeout(() => setBulkResult(null), 5000);
    } catch (err) {
      setBulkResult(`Error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setBulkPending(false);
    }
  }

  const selectCls =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Pending Changes
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Field changes detected during sync. Review and approve, deny, or flag
          each one.
        </p>
      </div>

      {/* Filter + bulk actions */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setBulkResult(null);
          }}
          className={selectCls}
        >
          <option value="all">All states</option>
          {availableStates.map((s) => (
            <option key={s} value={s!}>
              {STATE_NAMES[s!] ?? s!.toUpperCase()}
            </option>
          ))}
        </select>

        {stateFilter !== "all" && (
          <button
            onClick={handleBulkApprove}
            disabled={bulkPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 dark:bg-green-500 dark:hover:bg-green-600"
          >
            {bulkPending
              ? "Approving…"
              : `Bulk Approve High Confidence (${STATE_NAMES[stateFilter] ?? stateFilter.toUpperCase()})`}
          </button>
        )}

        {bulkResult && (
          <span
            className={`text-sm font-medium ${
              bulkResult.startsWith("Error")
                ? "text-red-600 dark:text-red-400"
                : "text-green-700 dark:text-green-400"
            }`}
          >
            {bulkResult}
          </span>
        )}
      </div>

      {/* Loading */}
      {rows === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-36 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered !== undefined && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No pending changes
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {stateFilter !== "all"
              ? `No changes for ${STATE_NAMES[stateFilter] ?? stateFilter}.`
              : "All changes have been reviewed. Sync leaders to check for updates."}
          </p>
        </div>
      )}

      {/* Change cards */}
      {filtered !== undefined && filtered.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} pending change{filtered.length !== 1 ? "s" : ""}
            {stateFilter !== "all"
              ? ` in ${STATE_NAMES[stateFilter] ?? stateFilter}`
              : ""}
          </p>
          {filtered.map((row) => (
            <ChangeCard key={row.change._id} row={row as ChangeWithLeader} />
          ))}
        </div>
      )}
    </div>
  );
}
