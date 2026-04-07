"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const DISMISS_REASON_LABELS: Record<string, string> = {
  wrong_focus: "Wrong focus area",
  too_restrictive: "Too restrictive / eligibility issue",
  not_eligible: "Not eligible",
  invitation_only: "Invitation only",
  other: "Other",
};

type HistoryGrant = {
  _id: Id<"grants">;
  title: string;
  funderName: string;
  status: string;
  awardAmount?: number;
  dismissReason?: string;
  decisionDate?: number;
  _creationTime: number;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted")
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        Awarded
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      Dismissed
    </span>
  );
}

function HistoryRow({ grant }: { grant: HistoryGrant }) {
  const reconsider = useMutation(api.grants.reconsider);
  const [pending, setPending] = useState(false);

  async function handleReconsider() {
    setPending(true);
    try {
      await reconsider({ grantId: grant._id });
    } finally {
      setPending(false);
    }
  }

  const date = grant.decisionDate ?? grant._creationTime;

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {grant.funderName}
          </span>
          <StatusBadge status={grant.status} />
        </div>
        <p className="mt-1 text-sm font-medium text-gray-900 leading-snug">
          {grant.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5">
          <span className="text-xs text-gray-400">{formatDate(date)}</span>
          {grant.status === "accepted" && grant.awardAmount !== undefined && (
            <span className="text-xs font-medium text-green-700">
              {formatCurrency(grant.awardAmount)} awarded
            </span>
          )}
          {grant.status === "dismissed" && grant.dismissReason && (
            <span className="text-xs text-gray-400">
              {DISMISS_REASON_LABELS[grant.dismissReason] ?? grant.dismissReason}
            </span>
          )}
        </div>
      </div>

      {grant.status === "dismissed" && (
        <button
          onClick={handleReconsider}
          disabled={pending}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          {pending ? "Moving…" : "Reconsider"}
        </button>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { isAuthenticated } = useConvexAuth();
  const grants = useQuery(
    api.grants.listHistory,
    isAuthenticated ? {} : "skip"
  );

  // Group by year of decision date
  const byYear = new Map<number, HistoryGrant[]>();
  if (grants) {
    for (const g of grants) {
      const year = new Date(g.decisionDate ?? g._creationTime).getFullYear();
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(g);
    }
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">History</h2>
        <p className="mt-1 text-sm text-gray-500">
          Past grant decisions — awarded, rejected, and dismissed.
        </p>
      </div>

      {grants === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {grants !== undefined && grants.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No grant history yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Past decisions will be recorded here.
          </p>
        </div>
      )}

      {grants !== undefined && grants.length > 0 && (
        <div className="space-y-6">
          {years.map((year) => (
            <section key={year}>
              <h3 className="mb-2 text-sm font-semibold text-gray-500">{year}</h3>
              <div className="rounded-xl border border-gray-200 bg-white px-4 sm:px-5">
                {byYear.get(year)!.map((grant, i, arr) => (
                  <div
                    key={grant._id}
                    className={i < arr.length - 1 ? "border-b border-gray-100" : ""}
                  >
                    <HistoryRow grant={grant} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
