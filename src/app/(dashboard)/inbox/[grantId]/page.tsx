"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DismissModal } from "@/components/dismiss-modal";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-6">
      <dt className="w-36 shrink-0 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export default function GrantDetailPage({
  params,
}: {
  params: Promise<{ grantId: string }>;
}) {
  const { grantId } = use(params);
  const router = useRouter();

  const result = useQuery(api.grants.getById, {
    grantId: grantId as Id<"grants">,
  });

  const approveMutation = useMutation(api.grants.approve);
  const dismissMutation = useMutation(api.grants.dismiss);

  const [showDismiss, setShowDismiss] = useState(false);
  const [approvePending, setApprovePending] = useState(false);
  const [dismissPending, setDismissPending] = useState(false);

  // Loading
  if (result === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  // Not found
  if (result === null) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <p className="text-sm text-gray-500">Grant not found.</p>
        <Link href="/inbox" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
          Back to inbox
        </Link>
      </div>
    );
  }

  const { grant, funder } = result;
  const now = Date.now();
  const isUrgent =
    grant.deadline !== undefined &&
    grant.deadline > now &&
    grant.deadline - now < 30 * MS_PER_DAY;

  async function handleApprove() {
    setApprovePending(true);
    try {
      await approveMutation({ grantId: grant._id });
      router.push("/inbox");
    } finally {
      setApprovePending(false);
    }
  }

  async function handleDismiss(reason?: string) {
    setDismissPending(true);
    try {
      await dismissMutation({ grantId: grant._id, reason });
      setShowDismiss(false);
      router.push("/inbox");
    } finally {
      setDismissPending(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <Link
          href="/inbox"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          Back to Inbox
        </Link>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {grant.funderName}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900 leading-snug">
            {grant.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {grant.status === "under_review" && <Badge color="blue">Under Review</Badge>}
            {grant.status === "pending_analysis" && <Badge color="amber">Pending Analysis</Badge>}
            {grant.acceptsUnsolicited === "yes" && <Badge color="green">Accepts Unsolicited</Badge>}
            {grant.acceptsUnsolicited === "no" && <Badge color="red">Invite Only</Badge>}
            {grant.requiresLoi && <Badge color="violet">LOI Required</Badge>}
          </div>
        </div>

        {/* Primary actions */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleApprove}
            disabled={approvePending}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {approvePending ? "Approving…" : "✓ Approve to Apply"}
          </button>
          <button
            disabled
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
            title="Coming soon — Claude AI integration"
          >
            Generate Draft Application
          </button>
          <button
            onClick={() => setShowDismiss(true)}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 sm:flex-none"
          >
            Dismiss
          </button>
        </div>

        {/* Grant details */}
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Grant Details</h2>
          </div>
          <dl className="px-5 py-4 space-y-3">
            {grant.deadline !== undefined && (
              <DetailRow label="Deadline">
                <span className={isUrgent ? "font-medium text-red-600" : ""}>
                  {isUrgent && "⚠ "}
                  {formatDate(grant.deadline)}
                  {isUrgent && " — within 30 days"}
                </span>
              </DetailRow>
            )}
            {(grant.amountMin || grant.amountMax) && (
              <DetailRow label="Amount">
                {grant.amountMin && grant.amountMax && grant.amountMin !== grant.amountMax
                  ? `${formatCurrency(grant.amountMin)} – ${formatCurrency(grant.amountMax)}`
                  : grant.amountMax
                    ? `Up to ${formatCurrency(grant.amountMax)}`
                    : formatCurrency(grant.amountMin!)}
              </DetailRow>
            )}
            {grant.isRecurring !== undefined && (
              <DetailRow label="Recurring">
                {grant.isRecurring ? "Yes" : "No"}
              </DetailRow>
            )}
            {grant.requiresLoi !== undefined && (
              <DetailRow label="Requires LOI">
                {grant.requiresLoi ? "Yes" : "No"}
              </DetailRow>
            )}
            {grant.sourceUrl && (
              <DetailRow label="Source">
                <a
                  href={grant.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gray-700 underline underline-offset-2 hover:text-gray-900"
                >
                  {(() => {
                    try { return new URL(grant.sourceUrl).hostname.replace(/^www\./, ""); }
                    catch { return grant.sourceUrl; }
                  })()}
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.5-.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.56l-4.72 4.72a.75.75 0 0 1-1.06-1.06l4.72-4.72h-1.69a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                  </svg>
                </a>
              </DetailRow>
            )}
          </dl>
        </div>

        {/* Funder notes */}
        {funder?.notes && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              About {funder.name}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {funder.notes}
            </p>
            {funder.website && (
              <a
                href={funder.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                Visit website
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.5-.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.56l-4.72 4.72a.75.75 0 0 1-1.06-1.06l4.72-4.72h-1.69a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Raw text */}
        {grant.rawText && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              Full Description
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {grant.rawText}
            </p>
          </div>
        )}

        {/* Bottom actions (mobile convenience) */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row pb-8">
          <button
            onClick={handleApprove}
            disabled={approvePending}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {approvePending ? "Approving…" : "✓ Approve to Apply"}
          </button>
          <button
            onClick={() => setShowDismiss(true)}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Dismiss
          </button>
        </div>
      </div>

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
