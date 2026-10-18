"use client";

import { useMemo, useTransition, useState } from "react";
import {
  toggleUserActiveAction,
  generatePasswordResetAction,
} from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  active: boolean;
  createdAt: Date;
}

export default function UserTable({ users }: { users: User[] }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredUsers = useMemo(
    () => users.filter((user) =>
      !normalizedQuery || [user.name, user.email, user.role].some((value) =>
        value.toLocaleLowerCase(locale).includes(normalizedQuery)
      )
    ),
    [locale, normalizedQuery, users]
  );

  return (
    <div className="rounded-2xl border border-ink/15 bg-paper-2">
      <div className="border-b border-ink/15 p-4">
        <label htmlFor="user-search" className="sr-only">{t.admin.table.search}</label>
        <input
          id="user-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.admin.table.searchPlaceholder}
          className="min-h-11 w-full max-w-md rounded-xl border border-ink/15 bg-paper/70 px-4 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-sea focus:ring-2 focus:ring-sea/30"
        />
        <p className="mt-2 text-xs text-ink-3" aria-live="polite">{fmt(t.admin.table.count, { shown: filteredUsers.length, total: users.length })}</p>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">{t.admin.table.caption}</caption>
        <thead className="bg-paper/60 text-xs uppercase tracking-wider text-ink-3">
          <tr>
            <th scope="col" className="text-left px-5 py-3">{t.admin.table.colName}</th>
            <th scope="col" className="text-left px-5 py-3">{t.admin.table.colEmail}</th>
            <th scope="col" className="text-left px-5 py-3">{t.admin.table.colRole}</th>
            <th scope="col" className="text-left px-5 py-3">{t.admin.table.colStatus}</th>
            <th scope="col" className="text-left px-5 py-3">{t.admin.table.colActions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">
          {filteredUsers.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
          {filteredUsers.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-3">{t.admin.table.noResults}</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleActive = () => {
    startTransition(async () => {
      const result = await toggleUserActiveAction(user.id, !user.active);
      if ("error" in result && result.error) setFeedback(result.error);
    });
  };

  const generateReset = () => {
    startTransition(async () => {
      const result = await generatePasswordResetAction(user.id);
      if ("resetUrl" in result && result.resetUrl) setResetUrl(result.resetUrl);
      if ("error" in result && result.error) setFeedback(result.error);
    });
  };

  const copyResetUrl = async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setFeedback(t.admin.table.linkCopied);
    } catch {
      setFeedback(t.admin.table.copyFailed);
    }
  };

  return (
    <tr className={!user.active ? "opacity-50" : ""}>
      <td className="px-5 py-4 font-medium text-ink">
        {user.name}
      </td>
      <td className="px-5 py-4 text-ink-2">
        {user.email}
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            user.role === "ADMIN"
              ? "bg-sea/10 text-sea border border-sea/20"
              : "bg-paper text-ink-2 border border-ink/15"
          }`}
        >
          {user.role === "ADMIN" ? t.admin.table.roleAdmin : t.admin.table.roleUser}
        </span>
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            user.active
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
          }`}
        >
          {user.active ? t.admin.table.active : t.admin.table.inactive}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {user.role !== "ADMIN" && (
            <button
              onClick={toggleActive}
              disabled={isPending}
              className="min-h-9 rounded-lg border border-ink/15 px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper disabled:opacity-50"
            >
              {user.active ? t.admin.table.deactivate : t.admin.table.activate}
            </button>
          )}
          <button
            onClick={generateReset}
            disabled={isPending}
            className="min-h-9 rounded-lg border border-sea/30 px-3 text-xs font-semibold text-sea transition-colors hover:bg-sea/10 disabled:opacity-50"
          >
            {t.admin.table.resetPassword}
          </button>
        </div>
        {resetUrl && (
          <div className="mt-2 max-w-md break-all rounded-lg border border-sea/20 bg-sea/10 p-2 text-xs">
            <span className="font-medium text-sea">{t.admin.table.link}</span>
            <code className="text-sea">{resetUrl}</code>
            <button type="button" onClick={copyResetUrl} className="mt-2 block min-h-9 rounded-lg bg-voltio px-3 font-bold text-basalto hover:bg-voltio/90">{t.admin.table.copyLink}</button>
          </div>
        )}
        {feedback && <p role="status" className="mt-2 text-xs text-ink-2">{feedback}</p>}
      </td>
    </tr>
  );
}
