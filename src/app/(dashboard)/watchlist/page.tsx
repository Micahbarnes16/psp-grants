"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
}

function formatAmount(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `$${Math.round(n / 1_000)}k`
        : `$${n}`;
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  if (max && (!min || min === max)) return min ? fmt(min) : `Up to ${fmt(max)}`;
  return fmt(min!);
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : score >= 40
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>
      {score}
    </span>
  );
}

function WatchlistCard({
  grant,
  alignmentScore,
}: {
  grant: {
    _id: Id<"grants">;
    title: string;
    funderName: string;
    status: string;
    deadline?: number;
    amountMin?: number;
    amountMax?: number;
    sourceUrl?: string;
    acceptsUnsolicited?: string;
  };
  alignmentScore?: number;
}) {
  const markAccessible = useMutation(api.grants.markAccessible);
  const [pending, setPending] = useState(false);

  const now = Date.now();
  const isUrgent =
    grant.deadline !== undefined &&
    grant.deadline > now &&
    grant.deadline - now < 30 * MS_PER_DAY;
  const isPast = grant.deadline !== undefined && grant.deadline < now;

  const amountStr = formatAmount(grant.amountMin, grant.amountMax);

  async function handleMarkAccessible() {
    setPending(true);
    try {
      await markAccessible({ grantId: grant._id });
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      {/* Funder + score */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {grant.funderName}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          Invite Only
        </span>
        {alignmentScore !== undefined && (
          <span className="ml-auto">
            <ScoreBadge score={alignmentScore} />
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2 line-clamp-2 text-base font-semibold text-gray-900 leading-snug dark:text-gray-100">
        {grant.title}
      </h3>

      {/* Note */}
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Requires invitation or existing relationship.
      </p>

      {/* Deadline + Amount */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {grant.deadline !== undefined ? (
          <span
            className={`text-sm ${
              isPast
                ? "text-gray-400 line-through dark:text-gray-600"
                : isUrgent
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {formatDate(grant.deadline)}
          </span>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            No deadline listed
          </span>
        )}
        {amountStr && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {amountStr}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Link
          href={`/inbox/${grant._id}`}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View Details
        </Link>
        <button
          onClick={handleMarkAccessible}
          disabled={pending}
          className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          title="Move this grant to your inbox (we now have a relationship with this funder)"
        >
          {pending ? "Moving…" : "Mark as Accessible"}
        </button>
      </div>
    </article>
  );
}

export default function WatchlistPage() {
  const { isAuthenticated } = useConvexAuth();
  const grants = useQuery(
    api.grants.listWatchlist,
    isAuthenticated ? {} : "skip"
  );
  const analysisScores = useQuery(
    api.grants.listAnalysisScores,
    isAuthenticated ? {} : "skip"
  );

  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (analysisScores) {
      for (const a of analysisScores) {
        if (a.alignmentScore !== undefined) {
          map[a.grantId as string] = a.alignmentScore;
        }
      }
    }
    return map;
  }, [analysisScores]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Watchlist
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Invite-only and relationship-required grants. Track these as PSP
          builds funder relationships over time.
        </p>
      </div>

      {/* Loading */}
      {grants === undefined && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {grants !== undefined && grants.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <svg
              className="h-6 w-6 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Watchlist is empty
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            No invite-only grants found. Check back after the next scrape.
          </p>
        </div>
      )}

      {/* Cards */}
      {grants !== undefined && grants.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {grants.map((grant) => (
            <WatchlistCard
              key={grant._id}
              grant={grant}
              alignmentScore={scoreMap[grant._id as string]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
