"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { EntryCard } from "@/components/entry/entry-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import {
  formatLongDate,
  shiftDateKey,
  todayKey,
  yearOfDateKey,
} from "@/lib/date";
import type { EntrySummary } from "@/lib/types";

export default function MemoriesPage() {
  const { locale, t } = useAppearance();
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setDateKey(todayKey());
  }, []);

  useEffect(() => {
    if (!dateKey) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getMemories(dateKey)
      .then((result) => {
        if (!cancelled) setEntries(result.entries);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, reload, t]);

  const groups = useMemo(() => {
    if (!dateKey) return [];
    const selectedYear = yearOfDateKey(dateKey);
    const grouped = new Map<number, EntrySummary[]>();
    for (const entry of entries) {
      const entryYear = yearOfDateKey(entry.dateKey);
      if (entryYear >= selectedYear) continue;
      const list = grouped.get(entryYear) ?? [];
      list.push(entry);
      grouped.set(entryYear, list);
    }
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  }, [entries, dateKey]);

  if (!dateKey) {
    return (
      <div className="fade-up">
        <PageHeader eyebrow={t("navMemories")} title={t("memoriesTitle")} subtitle={t("memoriesSubtitle")} />
        <div className="card mb-5 p-4 sm:p-5">
          <div className="skeleton h-10 w-64 max-w-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={t("navMemories")}
        title={t("memoriesTitle")}
        subtitle={t("memoriesSubtitle")}
        actions={
          <Link href={`/entry/${dateKey}`} className="btn btn-primary">
            <Sparkles size={15} />
            {t("openEntry")}
          </Link>
        }
      />

      <div className="card mb-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setDateKey(shiftDateKey(dateKey, -1))}
              aria-label={t("prevDay")}
            >
              <ChevronLeft size={17} />
            </button>
            <div className="min-w-[12rem] text-center">
              <p className="eyebrow">{t("pickDate")}</p>
              <p className="mt-0.5 font-serif text-lg font-semibold capitalize">{formatLongDate(dateKey, locale)}</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setDateKey(shiftDateKey(dateKey, 1))}
              aria-label={t("nextDay")}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <CalendarDays size={14} />
              <input
                type="date"
                value={dateKey}
                onChange={(event) => {
                  if (event.target.value) setDateKey(event.target.value);
                }}
                className="input h-8 py-1 text-xs"
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDateKey(todayKey())}
            >
              {t("today")}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}>
            {t("retry")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-28 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title={t("noMemoriesOnDate")}
          description={t("memoryHint")}
          icon={<Clock size={20} />}
          action={
            <Link href={`/entry/${dateKey}?new=1`} className="btn btn-primary">
              {t("createEntry")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map(([year, groupEntries]) => {
            const yearsAgo = yearOfDateKey(dateKey) - year;
            return (
              <section key={year}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge badge-primary">{year}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {yearsAgo} {t("yearsAgo")}
                  </span>
                </div>
                <div className="space-y-3">
                  {groupEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} showYear />
                  ))}
                </div>
              </section>
            );
          })}
          <p className="text-center text-xs text-[var(--muted)]">{t("memoryHint")}</p>
        </div>
      )}
    </div>
  );
}
