"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

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

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(ts));
}

type EditableFields = {
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  party: string;
  district: string;
  email: string;
  phone: string;
  website: string;
  birthday: string;
  birthplace: string;
  spouse: string;
  children: string;
  bio: string;
  photoUrl: string;
};

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500";

function Field({
  label,
  value,
  editing,
  field,
  textarea,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  field: keyof EditableFields;
  textarea?: boolean;
  onChange: (field: keyof EditableFields, val: string) => void;
}) {
  if (!editing && !value) return null;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">{label}</p>
      {editing ? (
        textarea ? (
          <textarea
            rows={4}
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            className={`${inputCls} resize-none`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            className={inputCls}
          />
        )
      ) : (
        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

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
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {party}
    </span>
  );
}

export default function LeaderDetailPage() {
  const params = useParams();
  const stateCode = (params?.stateCode as string)?.toLowerCase() ?? "";
  const leaderId = params?.leaderId as string;
  const { isAuthenticated } = useConvexAuth();

  const leader = useQuery(
    api.leaders.getLeader,
    isAuthenticated && leaderId
      ? { leaderId: leaderId as Id<"leaders"> }
      : "skip"
  );

  const updateLeader = useMutation(api.leaders.updateLeader);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [form, setForm] = useState<EditableFields>({
    firstName: "", lastName: "", fullName: "", title: "",
    party: "", district: "", email: "", phone: "", website: "",
    birthday: "", birthplace: "", spouse: "", children: "", bio: "", photoUrl: "",
  });

  // Sync form when leader loads or editing starts
  useEffect(() => {
    if (!leader) return;
    setForm({
      firstName: leader.firstName ?? "",
      lastName: leader.lastName ?? "",
      fullName: leader.fullName ?? "",
      title: leader.title ?? "",
      party: leader.party ?? "",
      district: leader.district ?? "",
      email: leader.email ?? "",
      phone: leader.phone ?? "",
      website: leader.website ?? "",
      birthday: leader.birthday ?? "",
      birthplace: leader.birthplace ?? "",
      spouse: leader.spouse ?? "",
      children: leader.children ?? "",
      bio: leader.bio ?? "",
      photoUrl: leader.photoUrl ?? "",
    });
  }, [leader]);

  function handleChange(field: keyof EditableFields, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function handleCancelEdit() {
    setEditing(false);
    if (leader) {
      setForm({
        firstName: leader.firstName ?? "",
        lastName: leader.lastName ?? "",
        fullName: leader.fullName ?? "",
        title: leader.title ?? "",
        party: leader.party ?? "",
        district: leader.district ?? "",
        email: leader.email ?? "",
        phone: leader.phone ?? "",
        website: leader.website ?? "",
        birthday: leader.birthday ?? "",
        birthplace: leader.birthplace ?? "",
        spouse: leader.spouse ?? "",
        children: leader.children ?? "",
        bio: leader.bio ?? "",
        photoUrl: leader.photoUrl ?? "",
      });
    }
  }

  async function handleSave() {
    if (!leader) return;
    setSaving(true);
    try {
      await updateLeader({
        leaderId: leader._id,
        updates: {
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          fullName: form.fullName || undefined,
          title: form.title || undefined,
          party: form.party || undefined,
          district: form.district || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          website: form.website || undefined,
          birthday: form.birthday || undefined,
          birthplace: form.birthplace || undefined,
          spouse: form.spouse || undefined,
          children: form.children || undefined,
          bio: form.bio || undefined,
          photoUrl: form.photoUrl || undefined,
        },
      });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } finally {
      setSaving(false);
    }
  }

  const stateName = STATE_NAMES[stateCode] ?? stateCode.toUpperCase();

  // Loading
  if (leader === undefined) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  // Not found
  if (leader === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Leader not found</p>
        </div>
      </div>
    );
  }

  const photoUrl = editing ? form.photoUrl : (leader.photoUrl ?? "");
  const showPhoto = !!photoUrl && !imgError;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Link href="/leaders/states" className="hover:text-gray-600 dark:hover:text-gray-300">
          States
        </Link>
        <span>/</span>
        <Link
          href={`/leaders/states/${stateCode}`}
          className="hover:text-gray-600 dark:hover:text-gray-300"
        >
          {stateName}
        </Link>
        <span>/</span>
        <span className="text-gray-600 dark:text-gray-300">{leader.fullName}</span>
      </div>

      {/* Header card */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex gap-4">
          {/* Photo */}
          <div className="shrink-0">
            {showPhoto ? (
              <div className="relative h-20 w-16 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                <Image
                  src={photoUrl}
                  alt={leader.fullName}
                  fill
                  className="object-cover object-top"
                  onError={() => setImgError(true)}
                  sizes="64px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-20 w-16 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" />
                </svg>
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {leader.fullName}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {leader.title ?? CHAMBER_LABELS[leader.chamber] ?? leader.chamber}
              {leader.district ? ` · District ${leader.district}` : ""}
              {" · "}{stateName}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PartyBadge party={leader.party} />
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {CHAMBER_LABELS[leader.chamber] ?? leader.chamber}
              </span>
              {leader.inOffice && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  In office
                </span>
              )}
            </div>
          </div>

          {/* Edit / Save actions */}
          <div className="shrink-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                    Saved
                  </span>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact & role section */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Contact & Role
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" value={editing ? form.firstName : (leader.firstName ?? "")} editing={editing} field="firstName" onChange={handleChange} />
          <Field label="Last name" value={editing ? form.lastName : (leader.lastName ?? "")} editing={editing} field="lastName" onChange={handleChange} />
          <Field label="Full name" value={editing ? form.fullName : (leader.fullName ?? "")} editing={editing} field="fullName" onChange={handleChange} />
          <Field label="Title" value={editing ? form.title : (leader.title ?? "")} editing={editing} field="title" onChange={handleChange} />
          <Field label="Party" value={editing ? form.party : (leader.party ?? "")} editing={editing} field="party" onChange={handleChange} />
          <Field label="District" value={editing ? form.district : (leader.district ?? "")} editing={editing} field="district" onChange={handleChange} />
          <Field label="Email" value={editing ? form.email : (leader.email ?? "")} editing={editing} field="email" onChange={handleChange} />
          <Field label="Phone" value={editing ? form.phone : (leader.phone ?? "")} editing={editing} field="phone" onChange={handleChange} />
          <Field label="Website" value={editing ? form.website : (leader.website ?? "")} editing={editing} field="website" onChange={handleChange} />
          <Field label="Photo URL" value={editing ? form.photoUrl : (leader.photoUrl ?? "")} editing={editing} field="photoUrl" onChange={handleChange} />
        </div>
      </div>

      {/* Personal section */}
      {(editing ||
        leader.birthday || leader.birthplace || leader.spouse ||
        leader.children || leader.bio) && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Personal
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Birthday" value={editing ? form.birthday : (leader.birthday ?? "")} editing={editing} field="birthday" onChange={handleChange} />
            <Field label="Birthplace" value={editing ? form.birthplace : (leader.birthplace ?? "")} editing={editing} field="birthplace" onChange={handleChange} />
            <Field label="Spouse" value={editing ? form.spouse : (leader.spouse ?? "")} editing={editing} field="spouse" onChange={handleChange} />
            <Field label="Children" value={editing ? form.children : (leader.children ?? "")} editing={editing} field="children" onChange={handleChange} />
          </div>
          <div className="mt-4">
            <Field label="Bio" value={editing ? form.bio : (leader.bio ?? "")} editing={editing} field="bio" textarea onChange={handleChange} />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Sync Info
        </h3>
        <dl className="space-y-2">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-400 dark:text-gray-500">Source</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">Open States · {leader.level} / {leader.branch}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-400 dark:text-gray-500">Last synced</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{formatDate(leader.lastSyncedAt)}</dd>
          </div>
          {leader.lastVerifiedAt && (
            <div className="flex justify-between text-sm">
              <dt className="text-gray-400 dark:text-gray-500">Last verified</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatDate(leader.lastVerifiedAt)}</dd>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <dt className="text-gray-400 dark:text-gray-500">External ID</dt>
            <dd className="font-mono text-xs text-gray-500 dark:text-gray-400">{leader.externalId}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
