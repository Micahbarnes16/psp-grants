"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useAction, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

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

const CHAMBER_LABELS: Record<string, string> = {
  upper: "Senate",
  lower: "House",
  legislature: "Legislature",
  unknown: "Unknown",
};

type Leader = {
  _id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title?: string;
  party?: string;
  district?: string;
  chamber: string;
  branch: string;
  photoUrl?: string;
  email?: string;
  website?: string;
  state: string;
};

function PartyBadge({ party }: { party?: string }) {
  if (!party) return null;
  const lower = party.toLowerCase();
  const cls =
    lower.includes("republican") || lower.includes("rep")
      ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : lower.includes("democrat") || lower.includes("dem")
        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {party}
    </span>
  );
}

function LeaderCard({ leader, stateCode }: { leader: Leader; stateCode: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/leaders/states/${stateCode}/${leader._id}`}
      className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
    >
      <div className="shrink-0">
        {leader.photoUrl && !imgError ? (
          <div className="relative h-14 w-12 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
            <Image
              src={leader.photoUrl}
              alt={leader.fullName}
              fill
              className="object-cover object-top"
              onError={() => setImgError(true)}
              sizes="48px"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-14 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <svg className="h-6 w-6 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {leader.fullName}
          </p>
          <PartyBadge party={leader.party} />
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {leader.title ?? CHAMBER_LABELS[leader.chamber] ?? leader.chamber}
          {leader.district ? ` · District ${leader.district}` : ""}
        </p>
        {leader.email && (
          <p className="mt-1.5 truncate text-xs text-gray-400 dark:text-gray-500">
            {leader.email}
          </p>
        )}
      </div>

      <div className="shrink-0 self-center">
        <svg className="h-4 w-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}

export default function StateDetailPage() {
  const params = useParams();
  const stateCode = (params?.stateCode as string)?.toLowerCase() ?? "";
  const { isAuthenticated } = useConvexAuth();

  const leaders = useQuery(
    api.leaders.listLeadersByState,
    isAuthenticated ? { state: stateCode } : "skip"
  );

  const syncState = useAction(api.leadersSync.syncState);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncState({ state: stateCode });
      setSyncResult(`Sync complete — ${result.total} leaders updated`);
    } catch (err) {
      setSyncResult(`Error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setSyncing(false);
    }
  }

  const [branchFilter, setBranchFilter] = useState<"all" | "upper" | "lower" | "other">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const searchResults = useQuery(
    api.leaders.searchLeaders,
    isAuthenticated && searchTerm.trim()
      ? { searchTerm: searchTerm.trim(), state: stateCode }
      : "skip"
  );

  const stateName = STATE_NAMES[stateCode] ?? stateCode.toUpperCase();
  const isSearching = searchTerm.trim().length > 0;

  const filteredByBranch = leaders
    ? leaders.filter((l) => {
        if (branchFilter === "all") return true;
        if (branchFilter === "upper") return l.chamber === "upper";
        if (branchFilter === "lower") return l.chamber === "lower";
        return l.chamber !== "upper" && l.chamber !== "lower";
      })
    : undefined;

  const displayLeaders = isSearching
    ? (searchResults ?? undefined)
    : filteredByBranch;

  const chamberCounts = leaders
    ? {
        upper: leaders.filter((l) => l.chamber === "upper").length,
        lower: leaders.filter((l) => l.chamber === "lower").length,
        other: leaders.filter((l) => l.chamber !== "upper" && l.chamber !== "lower").length,
      }
    : null;

  const filterBtnCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
        : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/leaders/states"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          All States
        </Link>
      </div>

      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {stateName}
          </h2>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            {syncing ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Syncing…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Sync Now
              </>
            )}
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {leaders !== undefined ? `${leaders.length} legislators` : "Loading…"}
        </p>
        {syncResult && (
          <p className={`mt-1.5 text-sm font-medium ${
            syncResult.startsWith("Error")
              ? "text-red-600 dark:text-red-400"
              : "text-green-700 dark:text-green-400"
          }`}>
            {syncResult}
          </p>
        )}
      </div>

      {/* Search + filters row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Local search */}
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${stateName} legislators…`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Chamber filter — hidden while searching */}
        {!isSearching && chamberCounts && leaders && leaders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setBranchFilter("all")} className={filterBtnCls(branchFilter === "all")}>
              All ({leaders.length})
            </button>
            {chamberCounts.upper > 0 && (
              <button onClick={() => setBranchFilter("upper")} className={filterBtnCls(branchFilter === "upper")}>
                Senate ({chamberCounts.upper})
              </button>
            )}
            {chamberCounts.lower > 0 && (
              <button onClick={() => setBranchFilter("lower")} className={filterBtnCls(branchFilter === "lower")}>
                House ({chamberCounts.lower})
              </button>
            )}
            {chamberCounts.other > 0 && (
              <button onClick={() => setBranchFilter("other")} className={filterBtnCls(branchFilter === "other")}>
                Other ({chamberCounts.other})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {displayLeaders === undefined && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {/* Empty */}
      {displayLeaders !== undefined && displayLeaders.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isSearching ? "No results" : "No leaders found"}
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {isSearching
              ? `No legislators matching "${searchTerm}" in ${stateName}.`
              : leaders?.length === 0
                ? "This state hasn't been synced yet."
                : "No leaders match the selected filter."}
          </p>
        </div>
      )}

      {/* Cards */}
      {displayLeaders !== undefined && displayLeaders.length > 0 && (
        <>
          {isSearching && (
            <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
              {displayLeaders.length} result{displayLeaders.length !== 1 ? "s" : ""} for &ldquo;{searchTerm}&rdquo;
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {displayLeaders.map((leader) => (
              <LeaderCard key={leader._id} leader={leader as Leader} stateCode={stateCode} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
