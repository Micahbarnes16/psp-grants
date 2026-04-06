"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { DismissModal } from "./dismiss-modal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
}

function formatAmount(min?: number, max?: number) {
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

function hostFrom(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Badge primitives
// ---------------------------------------------------------------------------
function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "gray" | "blue" | "green" | "red" | "amber" | "violet";
}) {
  const colors = {
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "under_review")
    return <Badge color="blue">Under Review</Badge>;
  return <Badge color="amber">Pending Analysis</Badge>;
}

function UnsolicitedBadge({ value }: { value?: string }) {
  if (value === "yes")
    return <Badge color="green">Accepts Unsolicited</Badge>;
  if (value === "no")
    return <Badge color="red">Invite Only</Badge>;
  return <Badge color="gray">Solicitation Unknown</Badge>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface GrantCardProps {
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
    requiresLoi?: boolean;
  };
}

export function GrantCard({ grant }: GrantCardProps) {
  const router = useRouter();
  const setUnderReview = useMutation(api.grants.setUnderReview);
  const dismissGrant = useMutation(api.grants.dismiss);

  const [showDismiss, setShowDismiss] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);
  const [dismissPending, setDismissPending] = useState(false);

  const now = Date.now();
  const isUrgent =
    grant.deadline !== undefined &&
    grant.deadline > now &&
    grant.deadline - now < 30 * MS_PER_DAY;
  const isPast =
    grant.deadline !== undefined && grant.deadline < now;

  async function handleReview() {
    setReviewPending(true);
    try {
      await setUnderReview({ grantId: grant._id });
      router.push(`/inbox/${grant._id}`);
    } finally {
      setReviewPending(false);
    }
  }

  async function handleDismiss(reason?: string) {
    setDismissPending(true);
    try {
      await dismissGrant({ grantId: grant._id, reason });
      setShowDismiss(false);
    } finally {
      setDismissPending(false);
    }
  }

  const amountStr = formatAmount(grant.amountMin, grant.amountMax);
  const host = hostFrom(grant.sourceUrl);

  return (
    <>
      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
        {/* Funder + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {grant.funderName}
          </span>
          <StatusBadge status={grant.status} />
          <UnsolicitedBadge value={grant.acceptsUnsolicited} />
          {grant.requiresLoi && (
            <Badge color="violet">LOI Required</Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2 text-base font-semibold text-gray-900 leading-snug">
          {grant.title}
        </h3>

        {/* Deadline + Amount */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {grant.deadline !== undefined ? (
            <span
              className={`flex items-center gap-1 text-sm ${
                isPast
                  ? "text-gray-400 line-through"
                  : isUrgent
                    ? "font-medium text-red-600"
                    : "text-gray-600"
              }`}
            >
              {isUrgent && (
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {formatDate(grant.deadline)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">No deadline listed</span>
          )}

          {amountStr && (
            <span className="text-sm font-medium text-gray-700">
              {amountStr}
            </span>
          )}
        </div>

        {/* Source URL */}
        {host && grant.sourceUrl && (
          <a
            href={grant.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            {host}
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.5-.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.56l-4.72 4.72a.75.75 0 0 1-1.06-1.06l4.72-4.72h-1.69a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleReview}
            disabled={reviewPending}
            className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 sm:flex-none sm:px-4"
          >
            {reviewPending ? "Opening…" : "Review"}
          </button>
          <button
            onClick={() => setShowDismiss(true)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 sm:flex-none sm:px-4"
          >
            Dismiss
          </button>
        </div>
      </article>

      {showDismiss && (
        <DismissModal
          grantTitle={grant.title}
          onConfirm={handleDismiss}
          onCancel={() => setShowDismiss(false)}
          isPending={dismissPending}
        />
      )}
    </>
  );
}
