"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
      <dt className="w-36 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100">{children}</dd>
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
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    red: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function AlignmentBar({ score }: { score: number }) {
  const barColor =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-500";
  const labelColor =
    score >= 70
      ? "text-green-700 dark:text-green-400"
      : score >= 40
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Alignment Score
        </span>
        <span className={`text-sm font-bold ${labelColor}`}>{score}/100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function DraftModal({
  content,
  onClose,
}: {
  content: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800 max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Generated Draft Application
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {content}
          </pre>
        </div>
        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button
            onClick={handleCopy}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GrantDetailPage({
  params,
}: {
  params: Promise<{ grantId: string }>;
}) {
  const { grantId } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const result = useQuery(
    api.grants.getById,
    isAuthenticated ? { grantId: grantId as Id<"grants"> } : "skip"
  );

  const analysis = useQuery(
    api.grants.getAnalysis,
    isAuthenticated ? { grantId: grantId as Id<"grants"> } : "skip"
  );

  const approveMutation = useMutation(api.grants.approve);
  const dismissMutation = useMutation(api.grants.dismiss);
  const analyzeGrantAction = useAction(api.ai.analyzeGrant);
  const generateDraftAction = useAction(api.ai.generateDraft);

  const [showDismiss, setShowDismiss] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [approvePending, setApprovePending] = useState(false);
  const [dismissPending, setDismissPending] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Loading
  if (result === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  // Not found
  if (result === null) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <p className="text-sm text-gray-500 dark:text-gray-400">Grant not found.</p>
        <Link
          href="/inbox"
          className="mt-4 inline-block text-sm font-medium text-gray-900 underline dark:text-gray-100"
        >
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

  const hasAnalysis = analysis != null;

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

  async function handleAnalyze() {
    setAnalysing(true);
    try {
      await analyzeGrantAction({ grantId: grant._id });
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalysing(false);
    }
  }

  async function handleGenerateDraft() {
    setGeneratingDraft(true);
    try {
      await generateDraftAction({ grantId: grant._id });
      setShowDraft(true);
    } catch (err) {
      console.error("Draft generation failed:", err);
    } finally {
      setGeneratingDraft(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <Link
          href="/inbox"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {grant.funderName}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900 leading-snug dark:text-gray-100">
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
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {approvePending ? "Approving…" : "✓ Approve to Apply"}
          </button>

          {hasAnalysis ? (
            <button
              onClick={handleGenerateDraft}
              disabled={generatingDraft}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {generatingDraft ? "Generating…" : "Generate Draft Application"}
            </button>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={analysing}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {analysing ? "Analyzing…" : "✦ Analyze with AI"}
            </button>
          )}

          <button
            onClick={() => setShowDismiss(true)}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 sm:flex-none"
          >
            Dismiss
          </button>
        </div>

        {/* Grant details */}
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:divide-gray-700">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Grant Details</h2>
          </div>
          <dl className="px-5 py-4 space-y-3">
            {grant.deadline !== undefined && (
              <DetailRow label="Deadline">
                <span className={isUrgent ? "font-medium text-red-600 dark:text-red-400" : ""}>
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
              <DetailRow label="Recurring">{grant.isRecurring ? "Yes" : "No"}</DetailRow>
            )}
            {grant.requiresLoi !== undefined && (
              <DetailRow label="Requires LOI">{grant.requiresLoi ? "Yes" : "No"}</DetailRow>
            )}
            {grant.sourceUrl && (
              <DetailRow label="Source">
                <a
                  href={grant.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gray-700 underline underline-offset-2 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  {(() => {
                    try {
                      return new URL(grant.sourceUrl).hostname.replace(/^www\./, "");
                    } catch {
                      return grant.sourceUrl;
                    }
                  })()}
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.5-.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.56l-4.72 4.72a.75.75 0 0 1-1.06-1.06l4.72-4.72h-1.69a.75.75 0 0 1-.75-.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </DetailRow>
            )}
          </dl>
        </div>

        {/* AI Analysis card */}
        {hasAnalysis && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                AI Analysis
              </h2>
              <button
                onClick={handleAnalyze}
                disabled={analysing}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {analysing ? "Analyzing…" : "Re-analyze"}
              </button>
            </div>

            <AlignmentBar score={analysis.alignmentScore ?? 0} />

            {analysis.summary && (
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {analysis.summary}
              </p>
            )}

            {analysis.pros && analysis.pros.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                  Pros
                </h3>
                <ul className="space-y-1">
                  {analysis.pros.map((pro, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.cons && analysis.cons.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Cons
                </h3>
                <ul className="space-y-1">
                  {analysis.cons.map((con, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span className="mt-0.5 shrink-0 text-red-400">✗</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.recommendedFundingNeed && (
              <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Recommended for:{" "}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {analysis.recommendedFundingNeed}
                </span>
              </div>
            )}

            {analysis.suggestedApproach && (
              <div className="mt-4">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Suggested Approach
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {analysis.suggestedApproach}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Funder notes */}
        {funder?.notes && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              About {funder.name}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line dark:text-gray-400">
              {funder.notes}
            </p>
            {funder.website && (
              <a
                href={funder.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                Visit website
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.5-.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.56l-4.72 4.72a.75.75 0 0 1-1.06-1.06l4.72-4.72h-1.69a.75.75 0 0 1-.75-.75Z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Raw text */}
        {grant.rawText && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Full Description
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line dark:text-gray-400">
              {grant.rawText}
            </p>
          </div>
        )}

        {/* Bottom actions (mobile convenience) */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row pb-8">
          <button
            onClick={handleApprove}
            disabled={approvePending}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {approvePending ? "Approving…" : "✓ Approve to Apply"}
          </button>
          <button
            onClick={() => setShowDismiss(true)}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
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

      {showDraft && analysis?.draftContent && (
        <DraftModal
          content={analysis.draftContent}
          onClose={() => setShowDraft(false)}
        />
      )}
    </>
  );
}
