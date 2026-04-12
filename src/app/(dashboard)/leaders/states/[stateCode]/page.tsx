"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useAction, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
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
  "u.s._senate": "U.S. Senate",
  "u.s._house": "U.S. House",
  unknown: "Unknown",
};

type TabId = "senate" | "house" | "legislature" | "statewide" | "congress" | "judicial";

type Leader = {
  _id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title?: string;
  office?: string;
  party?: string;
  district?: string;
  chamber: string;
  branch: string;
  photoUrl?: string;
  email?: string;
  website?: string;
  state: string;
};

// ---------------------------------------------------------------------------
// District sorting helpers
// ---------------------------------------------------------------------------
function parseDistrictNum(d: string): number | null {
  const n = parseInt(d, 10);
  return isNaN(n) ? null : n;
}

function sortByDistrict<T extends { district?: string; fullName: string }>(
  leaders: T[]
): T[] {
  return [...leaders].sort((a, b) => {
    if (!a.district && !b.district) return a.fullName.localeCompare(b.fullName);
    if (!a.district) return 1;
    if (!b.district) return -1;

    const aNum = parseDistrictNum(a.district);
    const bNum = parseDistrictNum(b.district);

    if (aNum !== null && bNum !== null) return aNum - bNum;
    if (aNum !== null) return -1;
    if (bNum !== null) return 1;
    return a.district.localeCompare(b.district);
  });
}

type DistrictGroup = { district: string | null; members: Leader[] };

function groupByDistrict(leaders: Leader[]): DistrictGroup[] {
  const map = new Map<string | null, Leader[]>();
  for (const leader of leaders) {
    const key = leader.district ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(leader);
  }
  return [...map.entries()].map(([district, members]) => ({ district, members }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
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
  const subtitle = leader.title ?? leader.office ?? CHAMBER_LABELS[leader.chamber] ?? leader.chamber;

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
          {subtitle}
        </p>
        {leader.district && (
          <p className="mt-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
            District {leader.district}
          </p>
        )}
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

function PlaceholderCard({ office }: { office: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 opacity-70 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <svg className="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1 self-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{office}</p>
        <span className="mt-1 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-400">
          Not yet synced
        </span>
      </div>
    </div>
  );
}

// Simple grid (no sorting) — used for statewide and search results
function LeaderGrid({ leaders, stateCode, emptyMessage }: {
  leaders: Leader[] | undefined;
  stateCode: string;
  emptyMessage?: string;
}) {
  if (leaders === undefined) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }
  if (leaders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No leaders found</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          {emptyMessage ?? "This chamber hasn't been synced yet."}
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {leaders.map((leader) => (
        <LeaderCard key={leader._id} leader={leader} stateCode={stateCode} />
      ))}
    </div>
  );
}

// District-sorted grid with optional grouping for multi-member districts
function DistrictedLeaderGrid({ leaders, stateCode, emptyMessage }: {
  leaders: Leader[] | undefined;
  stateCode: string;
  emptyMessage?: string;
}) {
  if (leaders === undefined) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }
  if (leaders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No leaders found</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          {emptyMessage ?? "This chamber hasn't been synced yet."}
        </p>
      </div>
    );
  }

  const sorted = sortByDistrict(leaders);

  // Detect multi-member districts
  const districtCounts = new Map<string, number>();
  for (const l of sorted) {
    if (l.district) {
      districtCounts.set(l.district, (districtCounts.get(l.district) ?? 0) + 1);
    }
  }
  const hasMultiMemberDistricts = [...districtCounts.values()].some((v) => v > 1);

  if (!hasMultiMemberDistricts) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map((leader) => (
          <LeaderCard key={leader._id} leader={leader} stateCode={stateCode} />
        ))}
      </div>
    );
  }

  // Group by district and render with headers
  const groups = groupByDistrict(sorted);

  return (
    <div className="space-y-5">
      {groups.map(({ district, members }) => (
        <div key={district ?? "no-district"}>
          {district && (
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              District {district}
            </h4>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {members.map((leader) => (
              <LeaderCard key={leader._id} leader={leader} stateCode={stateCode} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function StateDetailPage() {
  const params = useParams();
  const stateCode = (params?.stateCode as string)?.toLowerCase() ?? "";
  const { isAuthenticated } = useConvexAuth();

  const isNebraska = stateCode === "ne";
  const defaultTab: TabId = isNebraska ? "legislature" : "senate";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Sync Now — legislative + federal in one shot
  const syncStateFull = useAction(api.leadersSync.syncStateFull);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Federal sync
  const syncFederal = useAction(api.civicSync.syncFederalLeaders);
  const [syncingFederal, setSyncingFederal] = useState(false);
  const [federalSyncResult, setFederalSyncResult] = useState<string | null>(null);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Data queries
  const legislativeLeaders = useQuery(
    api.leaders.listLegislativeLeadersByState,
    isAuthenticated ? { state: stateCode } : "skip"
  );
  const federalLeaders = useQuery(
    api.leaders.listFederalLeadersByState,
    isAuthenticated ? { state: stateCode } : "skip"
  );
  const statewideData = useQuery(
    api.statewideOffices.getStatewideLeaders,
    isAuthenticated ? { stateCode } : "skip"
  );
  const searchResults = useQuery(
    api.leaders.searchLeaders,
    isAuthenticated && searchTerm.trim()
      ? { query: searchTerm.trim(), stateCode }
      : "skip"
  );

  const stateName = STATE_NAMES[stateCode] ?? stateCode.toUpperCase();
  const isSearching = searchTerm.trim().length > 0;

  // Split legislative by chamber
  const senateLeaders = legislativeLeaders?.filter((l) => l.chamber === "upper");
  const houseLeaders = legislativeLeaders?.filter((l) => l.chamber === "lower");

  // Split federal by chamber
  const usSenators = federalLeaders?.filter((l) => l.chamber === "u.s._senate");
  const usHouseReps = federalLeaders?.filter((l) => l.chamber === "u.s._house");

  const tabs: Array<{ id: TabId; label: string; count?: number }> = isNebraska
    ? [
        { id: "legislature", label: "Legislature", count: legislativeLeaders?.length },
        { id: "statewide", label: "Statewide" },
        { id: "congress", label: "U.S. Congress", count: federalLeaders?.length },
        { id: "judicial", label: "Judicial" },
      ]
    : [
        { id: "senate", label: "State Senate", count: senateLeaders?.length },
        { id: "house", label: "State House", count: houseLeaders?.length },
        { id: "statewide", label: "Statewide" },
        { id: "congress", label: "U.S. Congress", count: federalLeaders?.length },
        { id: "judicial", label: "Judicial" },
      ];

  async function handleSyncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncStateFull({ stateCode });
      const parts: string[] = [];
      if (result.legislative > 0) parts.push(`${result.legislative} legislative`);
      if (result.federal > 0) parts.push(`${result.federal} federal`);
      const summary = parts.length > 0 ? parts.join(", ") + " leaders updated" : "no changes";
      setSyncResult(
        `Sync complete — ${summary}`
        + (result.errors.length > 0 ? ` (${result.errors.length} error${result.errors.length > 1 ? "s" : ""})` : "")
      );
    } catch (err) {
      setSyncResult(`Error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncFederal() {
    setSyncingFederal(true);
    setFederalSyncResult(null);
    try {
      const result = await syncFederal({ stateCode });
      setFederalSyncResult(`Synced ${result.synced} federal legislators for ${stateName}`);
    } catch (err) {
      setFederalSyncResult(`Error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setSyncingFederal(false);
    }
  }

  const tabBtnCls = (active: boolean) =>
    `relative shrink-0 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? "text-amber-700 dark:text-amber-400"
        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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

      {/* Header */}
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
          {legislativeLeaders !== undefined
            ? `${legislativeLeaders.length} state legislators`
            : "Loading…"}
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

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${stateName} leaders…`}
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
      </div>

      {/* Search results */}
      {isSearching ? (
        <div>
          {searchResults === undefined && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          )}
          {searchResults !== undefined && searchResults.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No results</p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                No leaders matching &ldquo;{searchTerm}&rdquo; in {stateName}.
              </p>
            </div>
          )}
          {searchResults !== undefined && searchResults.length > 0 && (
            <>
              <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchTerm}&rdquo;
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {searchResults.map((l) => (
                  <LeaderCard key={l._id} leader={l as Leader} stateCode={stateCode} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Tab navigation */}
          <div className="mb-5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={tabBtnCls(activeTab === tab.id)}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: State Senate */}
          {activeTab === "senate" && (
            <DistrictedLeaderGrid
              leaders={senateLeaders as Leader[] | undefined}
              stateCode={stateCode}
              emptyMessage="The State Senate hasn't been synced yet. Use Sync Now above."
            />
          )}

          {/* Tab: State House */}
          {activeTab === "house" && (
            <DistrictedLeaderGrid
              leaders={houseLeaders as Leader[] | undefined}
              stateCode={stateCode}
              emptyMessage="The State House hasn't been synced yet. Use Sync Now above."
            />
          )}

          {/* Tab: Legislature (Nebraska unicameral) */}
          {activeTab === "legislature" && (
            <DistrictedLeaderGrid
              leaders={legislativeLeaders as Leader[] | undefined}
              stateCode={stateCode}
              emptyMessage="The Legislature hasn't been synced yet. Use Sync Now above."
            />
          )}

          {/* Tab: Statewide */}
          {activeTab === "statewide" && (
            <div>
              {statewideData === undefined && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              )}
              {statewideData !== undefined && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {statewideData.map(({ office, filled, leader }) =>
                    filled && leader ? (
                      <LeaderCard key={office} leader={leader as Leader} stateCode={stateCode} />
                    ) : (
                      <PlaceholderCard key={office} office={office} />
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: U.S. Congress */}
          {activeTab === "congress" && (
            <div className="space-y-6">
              {/* If no data yet, show a single Sync Federal Leaders button */}
              {federalLeaders !== undefined && federalLeaders.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Federal leaders not yet synced
                  </p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    Pull U.S. Senators and Representatives for {stateName} from Google Civic.
                  </p>
                  <button
                    onClick={handleSyncFederal}
                    disabled={syncingFederal}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  >
                    {syncingFederal ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Syncing…
                      </>
                    ) : (
                      "Sync Federal Leaders"
                    )}
                  </button>
                  {federalSyncResult && (
                    <p className={`mt-3 text-sm font-medium ${
                      federalSyncResult.startsWith("Error")
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-700 dark:text-green-400"
                    }`}>
                      {federalSyncResult}
                    </p>
                  )}
                </div>
              )}

              {/* Loading */}
              {federalLeaders === undefined && (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              )}

              {/* U.S. Senate sub-section */}
              {federalLeaders !== undefined && federalLeaders.length > 0 && (
                <>
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        U.S. Senate
                        {usSenators && (
                          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                            ({usSenators.length} of 2)
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={handleSyncFederal}
                        disabled={syncingFederal}
                        className="text-xs text-amber-700 hover:text-amber-800 disabled:opacity-60 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        {syncingFederal ? "Syncing…" : "Refresh"}
                      </button>
                    </div>
                    <LeaderGrid
                      leaders={usSenators as Leader[] | undefined}
                      stateCode={stateCode}
                      emptyMessage="No U.S. Senators found."
                    />
                  </div>

                  {/* U.S. House sub-section */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      U.S. House of Representatives
                      {usHouseReps && (
                        <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                          ({usHouseReps.length})
                        </span>
                      )}
                    </h3>
                    <DistrictedLeaderGrid
                      leaders={usHouseReps as Leader[] | undefined}
                      stateCode={stateCode}
                      emptyMessage="No U.S. Representatives found."
                    />
                  </div>

                  {federalSyncResult && (
                    <p className={`text-sm font-medium ${
                      federalSyncResult.startsWith("Error")
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-700 dark:text-green-400"
                    }`}>
                      {federalSyncResult}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab: Judicial */}
          {activeTab === "judicial" && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-600 dark:bg-gray-800">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <svg className="h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                State judicial data coming soon.
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                State supreme court and appellate judges will appear here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
