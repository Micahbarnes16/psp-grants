"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useConvexAuth } from "convex/react";
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

function LeaderCard({ leader }: { leader: Leader }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Photo */}
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
            <svg
              className="h-6 w-6 text-gray-300 dark:text-gray-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
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

        <div className="mt-2 flex flex-wrap gap-2">
          {leader.email && (
            <a
              href={`mailto:${leader.email}`}
              className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              {leader.email}
            </a>
          )}
          {leader.website && (
            <a
              href={leader.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              Website
            </a>
          )}
        </div>
      </div>
    </div>
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

  const [branchFilter, setBranchFilter] = useState<"all" | "upper" | "lower" | "other">(
    "all"
  );

  const stateName = STATE_NAMES[stateCode] ?? stateCode.toUpperCase();

  const filtered = leaders
    ? leaders.filter((l) => {
        if (branchFilter === "all") return true;
        if (branchFilter === "upper") return l.chamber === "upper";
        if (branchFilter === "lower") return l.chamber === "lower";
        return l.chamber !== "upper" && l.chamber !== "lower";
      })
    : undefined;

  const chamberCounts = leaders
    ? {
        upper: leaders.filter((l) => l.chamber === "upper").length,
        lower: leaders.filter((l) => l.chamber === "lower").length,
        other: leaders.filter((l) => l.chamber !== "upper" && l.chamber !== "lower")
          .length,
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

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {stateName}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {leaders !== undefined
            ? `${leaders.length} legislators`
            : "Loading…"}
        </p>
      </div>

      {/* Branch filter */}
      {chamberCounts && leaders && leaders.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setBranchFilter("all")}
            className={filterBtnCls(branchFilter === "all")}
          >
            All ({leaders.length})
          </button>
          {chamberCounts.upper > 0 && (
            <button
              onClick={() => setBranchFilter("upper")}
              className={filterBtnCls(branchFilter === "upper")}
            >
              Senate ({chamberCounts.upper})
            </button>
          )}
          {chamberCounts.lower > 0 && (
            <button
              onClick={() => setBranchFilter("lower")}
              className={filterBtnCls(branchFilter === "lower")}
            >
              House ({chamberCounts.lower})
            </button>
          )}
          {chamberCounts.other > 0 && (
            <button
              onClick={() => setBranchFilter("other")}
              className={filterBtnCls(branchFilter === "other")}
            >
              Other ({chamberCounts.other})
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {leaders === undefined && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered !== undefined && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No leaders found
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {leaders?.length === 0
              ? "This state hasn't been synced yet. Go to the Leaders dashboard to sync."
              : "No leaders match the selected filter."}
          </p>
        </div>
      )}

      {/* Leader cards */}
      {filtered !== undefined && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((leader) => (
            <LeaderCard key={leader._id} leader={leader as Leader} />
          ))}
        </div>
      )}
    </div>
  );
}
