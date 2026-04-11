"use client";

import { useState } from "react";
import { useQuery, useAction, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

const ALL_STATES = [
  { code: "al", name: "Alabama" }, { code: "ak", name: "Alaska" },
  { code: "az", name: "Arizona" }, { code: "ar", name: "Arkansas" },
  { code: "ca", name: "California" }, { code: "co", name: "Colorado" },
  { code: "ct", name: "Connecticut" }, { code: "de", name: "Delaware" },
  { code: "fl", name: "Florida" }, { code: "ga", name: "Georgia" },
  { code: "hi", name: "Hawaii" }, { code: "id", name: "Idaho" },
  { code: "il", name: "Illinois" }, { code: "in", name: "Indiana" },
  { code: "ia", name: "Iowa" }, { code: "ks", name: "Kansas" },
  { code: "ky", name: "Kentucky" }, { code: "la", name: "Louisiana" },
  { code: "me", name: "Maine" }, { code: "md", name: "Maryland" },
  { code: "ma", name: "Massachusetts" }, { code: "mi", name: "Michigan" },
  { code: "mn", name: "Minnesota" }, { code: "ms", name: "Mississippi" },
  { code: "mo", name: "Missouri" }, { code: "mt", name: "Montana" },
  { code: "ne", name: "Nebraska" }, { code: "nv", name: "Nevada" },
  { code: "nh", name: "New Hampshire" }, { code: "nj", name: "New Jersey" },
  { code: "nm", name: "New Mexico" }, { code: "ny", name: "New York" },
  { code: "nc", name: "North Carolina" }, { code: "nd", name: "North Dakota" },
  { code: "oh", name: "Ohio" }, { code: "ok", name: "Oklahoma" },
  { code: "or", name: "Oregon" }, { code: "pa", name: "Pennsylvania" },
  { code: "ri", name: "Rhode Island" }, { code: "sc", name: "South Carolina" },
  { code: "sd", name: "South Dakota" }, { code: "tn", name: "Tennessee" },
  { code: "tx", name: "Texas" }, { code: "ut", name: "Utah" },
  { code: "vt", name: "Vermont" }, { code: "va", name: "Virginia" },
  { code: "wa", name: "Washington" }, { code: "wv", name: "West Virginia" },
  { code: "wi", name: "Wisconsin" }, { code: "wy", name: "Wyoming" },
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>
      )}
    </div>
  );
}

export default function LeadersDashboardPage() {
  const { isAuthenticated } = useConvexAuth();
  const totalLeaders = useQuery(
    api.leaders.getLeaderCount,
    isAuthenticated ? {} : "skip"
  );
  const pendingCount = useQuery(
    api.leaders.getPendingChangesCount,
    isAuthenticated ? {} : "skip"
  );
  const statesStats = useQuery(
    api.leaders.getStatesStats,
    isAuthenticated ? {} : "skip"
  );

  const syncState = useAction(api.leadersSync.syncState);
  const syncAllStates = useAction(api.leadersSync.syncAllStates);

  const [selectedState, setSelectedState] = useState("in");
  const [syncingState, setSyncingState] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [stateResult, setStateResult] = useState<string | null>(null);
  const [allResult, setAllResult] = useState<string | null>(null);

  async function handleSyncState() {
    setSyncingState(true);
    setStateResult(null);
    try {
      const result = await syncState({ state: selectedState });
      setStateResult(
        `Done — ${result.total} total, ${result.new} new, ${result.updated} updated, ${result.unchanged} unchanged`
      );
    } catch (err) {
      setStateResult(`Error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setSyncingState(false);
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    setAllResult(null);
    try {
      const results = await syncAllStates({});
      const totalNew = results.reduce((sum, r) => sum + r.new, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
      const errors = results.filter((r) => r.error).length;
      setAllResult(
        `Done — ${totalNew} new, ${totalUpdated} updated${errors > 0 ? `, ${errors} states failed` : ""}`
      );
    } catch (err) {
      setAllResult(`Error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setSyncingAll(false);
    }
  }

  // Compute branch breakdown from states stats
  const statesCount = statesStats
    ? Object.keys(statesStats.leadersByState).length
    : 0;
  const statesWithData = statesStats
    ? Object.entries(statesStats.leadersByState)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  const selectCls =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Leaders
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          State legislators synced from Open States. Sync to pull the latest
          data.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Leaders"
          value={totalLeaders ?? "—"}
          sub={`across ${statesCount} states`}
        />
        <StatCard
          label="Pending Changes"
          value={pendingCount ?? "—"}
          sub="awaiting review"
        />
        <StatCard
          label="States Synced"
          value={statesCount}
          sub="of 50 states"
        />
      </div>

      {/* Sync controls */}
      <div className="space-y-4">
        {/* Sync single state */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Sync Single State
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Pull legislators for one state from Open States.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className={selectCls}
              disabled={syncingState}
            >
              {ALL_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSyncState}
              disabled={syncingState || syncingAll}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {syncingState ? "Syncing…" : "Sync State"}
            </button>
          </div>
          {stateResult && (
            <p
              className={`mt-3 text-sm font-medium ${
                stateResult.startsWith("Error")
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-700 dark:text-green-400"
              }`}
            >
              {stateResult}
            </p>
          )}
        </div>

        {/* Sync all states */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Sync All States
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Pull legislators for all 50 states. Takes several minutes due to
            rate limiting (2s delay per state).
          </p>
          <div className="mt-4">
            <button
              onClick={handleSyncAll}
              disabled={syncingState || syncingAll}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {syncingAll ? "Syncing all states… (this takes ~2 min)" : "Sync All 50 States"}
            </button>
          </div>
          {allResult && (
            <p
              className={`mt-3 text-sm font-medium ${
                allResult.startsWith("Error")
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-700 dark:text-green-400"
              }`}
            >
              {allResult}
            </p>
          )}
        </div>

        {/* Top states */}
        {statesWithData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Top States by Leader Count
            </h3>
            <div className="space-y-2">
              {statesWithData.map(([state, count]) => {
                const stateName =
                  ALL_STATES.find((s) => s.code === state)?.name ??
                  state.toUpperCase();
                const pending = statesStats?.changesByState[state] ?? 0;
                return (
                  <div
                    key={state}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {stateName}
                    </span>
                    <div className="flex items-center gap-3">
                      {pending > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          {pending} pending
                        </span>
                      )}
                      <span className="text-gray-500 dark:text-gray-400">
                        {count} leaders
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
