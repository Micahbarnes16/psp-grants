"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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

function SearchResultCard({ leader }: { leader: { _id: string; fullName: string; title?: string; party?: string; district?: string; chamber: string; state: string; photoUrl?: string } }) {
  const [imgError, setImgError] = useState(false);
  const lower = (leader.party ?? "").toLowerCase();
  const partyColor = lower.includes("republican") || lower.includes("rep")
    ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    : lower.includes("democrat") || lower.includes("dem")
      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
  const chamberLabel: Record<string, string> = { upper: "Senate", lower: "House", legislature: "Legislature" };

  return (
    <Link
      href={`/leaders/states/${leader.state}/${leader._id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
    >
      <div className="shrink-0">
        {leader.photoUrl && !imgError ? (
          <div className="relative h-10 w-8 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
            <Image src={leader.photoUrl} alt={leader.fullName} fill className="object-cover object-top" onError={() => setImgError(true)} sizes="32px" unoptimized />
          </div>
        ) : (
          <div className="flex h-10 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <svg className="h-5 w-5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{leader.fullName}</p>
        <p className="truncate text-xs text-gray-400 dark:text-gray-500">
          {leader.title ?? chamberLabel[leader.chamber] ?? leader.chamber}
          {leader.district ? ` · Dist. ${leader.district}` : ""}
          {" · "}{leader.state.toUpperCase()}
        </p>
      </div>
      {leader.party && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${partyColor}`}>{leader.party}</span>
      )}
      <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
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

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const searchResults = useQuery(
    api.leaders.searchLeaders,
    isAuthenticated && searchTerm.trim() ? { searchTerm: searchTerm.trim() } : "skip"
  );
  const isSearching = searchTerm.trim().length > 0;
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
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Leaders
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          State legislators synced from Open States. Sync to pull the latest
          data.
        </p>
      </div>

      {/* Global search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search all leaders by name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Search results */}
        {isSearching && (
          <div className="mt-2">
            {searchResults === undefined && (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            )}
            {searchResults !== undefined && searchResults.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                No leaders found matching &ldquo;{searchTerm}&rdquo;
              </p>
            )}
            {searchResults !== undefined && searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                </p>
                {searchResults.map((l) => (
                  <SearchResultCard key={l._id} leader={l} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats + sync controls — hidden while actively searching */}
      {!isSearching && (
      <div>
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
      )}
    </div>
  );
}
