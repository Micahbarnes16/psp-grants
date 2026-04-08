"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500";

const selectCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

function SaveRow({
  onSave,
  pending,
  saved,
  disabled,
}: {
  onSave: () => void;
  pending: boolean;
  saved: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={pending || disabled}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          Saved
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags input
// ---------------------------------------------------------------------------
function TagsInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function commit() {
    const trimmed = input.trim().replace(/,+$/, "");
    if (!trimmed || tags.includes(trimmed)) {
      setInput("");
      return;
    }
    onChange([...tags, trimmed]);
    setInput("");
  }

  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !input && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : "Add another…"}
        className="w-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Organization Profile
// ---------------------------------------------------------------------------
const GEO_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "indiana_only", label: "Indiana Only" },
  { value: "midwest", label: "Midwest" },
  { value: "all_50_states", label: "All 50 States" },
  { value: "national_international", label: "National + International" },
];

const BUDGET_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "under_100k", label: "Under $100,000" },
  { value: "100k_500k", label: "$100,000 – $500,000" },
  { value: "500k_1m", label: "$500,000 – $1M" },
  { value: "1m_5m", label: "$1M – $5M" },
  { value: "over_5m", label: "Over $5M" },
];

type ProfileData = {
  name: string;
  ein: string;
  mission: string;
  primaryPrograms: string;
  geographicScope: string;
  annualBudget: string;
  foundedYear: string;
  website: string;
  contactName: string;
  contactEmail: string;
  focusAreas: string[];
};

const EMPTY_PROFILE: ProfileData = {
  name: "Public Servants' Prayer Inc",
  ein: "82-2232515",
  mission: "We provide prayer and pastoral care in the political arena.",
  primaryPrograms:
    "Weekly Bible studies for the capitol community, weekly prayer times, career coaching and discipleship, personal counseling, daily evangelistic opportunities, funerals and weddings, annual Statehouse Prayer Services, Women's Statehouse Days, Pastors' Statehouse Days, biweekly Bagels and Books events, birthday card program for legislators.",
  geographicScope: "all_50_states",
  annualBudget: "100k_500k",
  foundedYear: "2004",
  website: "https://thepsp.org",
  contactName: "",
  contactEmail: "",
  focusAreas: [
    "evangelism",
    "discipleship",
    "prayer",
    "pastoral care",
    "civic engagement",
    "legislative outreach",
  ],
};

function ProfileSection({
  profileDoc,
}: {
  profileDoc: Record<string, unknown> | null | undefined;
}) {
  const upsertProfile = useMutation(api.psp.upsertProfile);
  const [form, setForm] = useState<ProfileData>(EMPTY_PROFILE);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profileDoc) return;
    setForm({
      name: (profileDoc.name as string) ?? "",
      ein: (profileDoc.ein as string) ?? "",
      mission: (profileDoc.mission as string) ?? "",
      primaryPrograms: (profileDoc.primaryPrograms as string) ?? "",
      geographicScope: (profileDoc.geographicScope as string) ?? "",
      annualBudget: (profileDoc.annualBudget as string) ?? "",
      foundedYear:
        profileDoc.foundedYear != null
          ? String(profileDoc.foundedYear)
          : "",
      website: (profileDoc.website as string) ?? "",
      contactName: (profileDoc.contactName as string) ?? "",
      contactEmail: (profileDoc.contactEmail as string) ?? "",
      focusAreas: (profileDoc.focusAreas as string[]) ?? [],
    });
  }, [profileDoc]);

  function set(field: keyof ProfileData, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setPending(true);
    try {
      const foundedYear = form.foundedYear
        ? parseInt(form.foundedYear, 10)
        : undefined;
      await upsertProfile({
        name: form.name.trim(),
        mission: form.mission.trim(),
        ein: form.ein.trim() || undefined,
        website: form.website.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        focusAreas: form.focusAreas,
        primaryPrograms: form.primaryPrograms.trim() || undefined,
        geographicScope: form.geographicScope || undefined,
        annualBudget: form.annualBudget || undefined,
        foundedYear:
          foundedYear && !isNaN(foundedYear) ? foundedYear : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } finally {
      setPending(false);
    }
  }

  if (profileDoc === undefined) {
    return (
      <SectionCard
        title="PSP Organization Profile"
        description="Core information about your organization used for grant matching."
      >
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="PSP Organization Profile"
      description="Core information about your organization used for grant matching."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Organization name" hint="Required">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Public Servants' Prayer"
              className={inputCls}
            />
          </Field>
          <Field label="EIN (tax ID)">
            <input
              type="text"
              value={form.ein}
              onChange={(e) => set("ein", e.target.value)}
              placeholder="XX-XXXXXXX"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Mission statement" hint="Required">
          <textarea
            rows={3}
            value={form.mission}
            onChange={(e) => set("mission", e.target.value)}
            placeholder="Describe your organization's core mission…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="Primary programs / activities">
          <textarea
            rows={2}
            value={form.primaryPrograms}
            onChange={(e) => set("primaryPrograms", e.target.value)}
            placeholder="Prayer mobilization, discipleship training, chaplaincy…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Geographic scope">
            <select
              value={form.geographicScope}
              onChange={(e) => set("geographicScope", e.target.value)}
              className={selectCls}
            >
              {GEO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Annual operating budget">
            <select
              value={form.annualBudget}
              onChange={(e) => set("annualBudget", e.target.value)}
              className={selectCls}
            >
              {BUDGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Founded year">
            <input
              type="number"
              value={form.foundedYear}
              onChange={(e) => set("foundedYear", e.target.value)}
              placeholder="2010"
              min={1800}
              max={new Date().getFullYear()}
              className={inputCls}
            />
          </Field>
          <Field label="Website URL">
            <input
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://example.org"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Primary contact name">
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Jane Smith"
              className={inputCls}
            />
          </Field>
          <Field label="Primary contact email">
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder="jane@example.org"
              className={inputCls}
            />
          </Field>
        </div>

        <Field
          label="Focus keywords"
          hint="Press Enter or comma to add. Used to match grants."
        >
          <TagsInput
            tags={form.focusAreas}
            onChange={(tags) => set("focusAreas", tags)}
            placeholder="Type a keyword and press Enter…"
          />
        </Field>
      </div>

      <SaveRow
        onSave={handleSave}
        pending={pending}
        saved={saved}
        disabled={!form.name.trim()}
      />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section: Notification Preferences
// ---------------------------------------------------------------------------
function NotificationsSection({
  profileDoc,
}: {
  profileDoc: Record<string, unknown> | null | undefined;
}) {
  const savePrefs = useMutation(api.psp.saveNotificationPrefs);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profileDoc) return;
    setNotifyEnabled((profileDoc.notifyNewGrants as boolean) ?? false);
    setEmail((profileDoc.notifyEmail as string) ?? "");
    setMinScore((profileDoc.notifyMinScore as number) ?? 70);
  }, [profileDoc]);

  async function handleSave() {
    setPending(true);
    try {
      await savePrefs({
        notifyNewGrants: notifyEnabled,
        notifyEmail: email.trim(),
        notifyMinScore: minScore,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionCard
      title="Notification Preferences"
      description="Control how and when you're alerted about new grant opportunities."
    >
      <div className="space-y-5">
        {/* Email notifications toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Email notifications
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Get notified when new matching grants are discovered.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyEnabled}
            onClick={() => {
              setNotifyEnabled((v) => !v);
              setSaved(false);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              notifyEnabled ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-gray-900 ${
                notifyEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {notifyEnabled && (
          <>
            <Field label="Notification email address">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                }}
                placeholder="you@example.org"
                className={inputCls}
              />
            </Field>

            <Field
              label={`Minimum match score: ${minScore}`}
              hint="Only notify when a grant scores at or above this threshold (0–100)."
            >
              <input
                type="range"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => {
                  setMinScore(parseInt(e.target.value, 10));
                  setSaved(false);
                }}
                className="w-full accent-gray-900 dark:accent-white"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>0 — all grants</span>
                <span>100 — perfect match only</span>
              </div>
            </Field>
          </>
        )}
      </div>

      <SaveRow onSave={handleSave} pending={pending} saved={saved} />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section: Scraper Sources
// ---------------------------------------------------------------------------

const DOMAIN_TO_SOURCE: Record<string, string> = {
  "chatlos.org": "chatlos.org",
  "lillyendowment.org": "lillyendowment.org",
  "crowelltrust.org": "crowelltrust.org",
  "foundationforevangelism.org": "foundationforevangelism.org",
  "ncfgiving.com": "ncfgiving.com",
  "stewardshipfdn.org": "stewardshipfdn.org",
  "givingcompass.org": "givingcompass.org",
  "grantwatch.com": "grantwatch.com",
  "zeffy.com": "zeffy.com",
};

function scraperSourceForFunder(website?: string): string | null {
  if (!website) return null;
  try {
    const hostname = new URL(website).hostname.replace(/^www\./, "");
    return DOMAIN_TO_SOURCE[hostname] ?? null;
  } catch {
    return null;
  }
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

type FunderDoc = {
  _id: Id<"funders">;
  name: string;
  website?: string;
  lastScrapedAt?: number;
  suspended?: boolean;
};

function FunderRow({ funder }: { funder: FunderDoc }) {
  const toggleSuspended = useMutation(api.funders.toggleSuspended);
  const runScraper = useAction(api.scrapers.index.runScraperBySource);
  const [togglePending, setTogglePending] = useState(false);
  const [runPending, setRunPending] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const source = scraperSourceForFunder(funder.website);

  async function handleToggle() {
    setTogglePending(true);
    try {
      await toggleSuspended({ funderId: funder._id });
    } finally {
      setTogglePending(false);
    }
  }

  async function handleRunNow() {
    if (!source) return;
    setRunPending(true);
    setRunResult(null);
    try {
      const result = await runScraper({ source });
      setRunResult(
        `Done — ${result.grantsFound} found, ${result.grantsAdded} added`
      );
      setTimeout(() => setRunResult(null), 6000);
    } catch (err) {
      setRunResult(`Error: ${err instanceof Error ? err.message : "failed"}`);
      setTimeout(() => setRunResult(null), 8000);
    } finally {
      setRunPending(false);
    }
  }

  const isSuspended = !!(funder as { suspended?: boolean }).suspended;

  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{funder.name}</span>
          {isSuspended ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Suspended
            </span>
          ) : (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
              Active
            </span>
          )}
        </div>
        {funder.website && (
          <a
            href={funder.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {funder.website}
          </a>
        )}
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          {funder.lastScrapedAt
            ? `Last scraped ${formatDate(funder.lastScrapedAt)}`
            : "Never scraped"}
        </p>
        {runResult && (
          <p
            className={`mt-1 text-xs font-medium ${
              runResult.startsWith("Error") ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"
            }`}
          >
            {runResult}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={togglePending}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {togglePending
            ? "…"
            : isSuspended
              ? "Re-enable"
              : "Suspend"}
        </button>
        {source && (
          <button
            onClick={handleRunNow}
            disabled={runPending || isSuspended}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {runPending ? "Running…" : "Run Now"}
          </button>
        )}
      </div>
    </div>
  );
}

function ScraperSourcesSection() {
  const { isAuthenticated } = useConvexAuth();
  const funders = useQuery(
    api.funders.listAll,
    isAuthenticated ? {} : "skip"
  );

  return (
    <SectionCard
      title="Scraper Sources"
      description="Funders tracked by automated scrapers. Suspend a funder to exclude it from future runs."
    >
      {funders === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      )}

      {funders !== undefined && funders.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          No funders yet — run the scrapers to populate this list.
        </p>
      )}

      {funders !== undefined && funders.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {funders.map((funder) => (
            <FunderRow key={funder._id} funder={funder} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { isAuthenticated } = useConvexAuth();
  const profileDoc = useQuery(
    api.psp.getProfile,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your organization profile, notifications, and data sources.
        </p>
      </div>

      <div className="space-y-6">
        <ProfileSection profileDoc={profileDoc ?? null} />
        <NotificationsSection profileDoc={profileDoc ?? null} />
        <ScraperSourcesSection />
      </div>
    </div>
  );
}
