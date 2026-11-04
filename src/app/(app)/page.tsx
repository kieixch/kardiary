"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
} from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { EntryCard } from "@/components/entry/entry-card";
import { api, type MemoriesPayload } from "@/lib/api";
import {
  addMonth,
  calendarDays,
  formatLongDate,
  formatMonthShort,
  formatMonthYear,
  monthKey,
  todayKey,
  toDateKey,
  weekdayLabels,
} from "@/lib/date";
import { idbGet, idbSet, localKeys } from "@/lib/idb";
import { findMood, moodLabel } from "@/lib/moods";
import type { EntrySummary, FullStats } from "@/lib/types";
import { cn } from "@/lib/utils";

interface YearCount {
  month: number;
  count: number;
}

function MonthSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-[var(--cell-gap)]">
      {Array.from({ length: 35 }, (_, index) => (
        <div key={index} className="skeleton" style={{ minHeight: "var(--cell-size)" }} />
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="skeleton h-3 w-32" />
          <div className="skeleton mt-3 h-9 w-56" />
          <div className="skeleton mt-2 h-4 w-72 max-w-full" />
        </div>
        <div className="skeleton h-11 w-36 rounded-full" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card p-5">
          <div className="skeleton mb-4 h-7 w-48" />
          <MonthSkeleton />
        </div>
        <div className="card p-5">
          <div className="skeleton h-5 w-1/2" />
          <div className="mt-4 space-y-3">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { settings, locale, t } = useAppearance();
  const [month, setMonth] = useState<Date | null>(null);
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FullStats | null>(null);
  const [memories, setMemories] = useState<MemoriesPayload | null>(null);
  const [yearCounts, setYearCounts] = useState<YearCount[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const activeMonth = month ? monthKey(month) : null;
  const year = month ? month.getFullYear() : null;

  useEffect(() => {
    const now = new Date();
    const currentToday = todayKey();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setToday(currentToday);
    const stored = window.localStorage.getItem(localKeys.lastSelectedDate);
    setSelectedDate(stored || currentToday);
  }, []);

  useEffect(() => {
    if (!activeMonth) return;
    let cancelled = false;
    const cacheKey = localKeys.monthCache(activeMonth);
    setLoading(true);
    setError(null);

    void idbGet<EntrySummary[]>(cacheKey).then((cached) => {
      if (!cancelled && cached) setEntries(cached);
    });

    api
      .listEntries({ month: activeMonth, limit: 1000 })
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        void idbSet(cacheKey, result.entries);
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
  }, [activeMonth, reload, t]);

  useEffect(() => {
    let cancelled = false;
    api
      .getStats()
      .then((result) => {
        if (!cancelled) setStats(result.stats);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    api
      .getMemories(today, true)
      .then((result) => {
        if (!cancelled) setMemories(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [today, reload]);

  useEffect(() => {
    if (year === null) return;
    let cancelled = false;
    const cacheKey = localKeys.yearCache(String(year));
    void idbGet<YearCount[]>(cacheKey).then((cached) => {
      if (!cancelled && cached) setYearCounts(cached);
    });
    api
      .listEntries({ year: String(year), limit: 1000 })
      .then((result) => {
        if (cancelled) return;
        const counts = Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          count: result.entries.filter((entry) => Number(entry.dateKey.slice(5, 7)) === index + 1).length,
        }));
        setYearCounts(counts);
        void idbSet(cacheKey, counts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [year, reload]);

  const days = useMemo(
    () => (month ? calendarDays(month, settings.calendar.firstDayOfWeek) : []),
    [month, settings.calendar.firstDayOfWeek],
  );
  const weekdays = useMemo(
    () => weekdayLabels(locale, settings.calendar.firstDayOfWeek),
    [locale, settings.calendar.firstDayOfWeek],
  );
  const entryMap = useMemo(() => {
    const map = new Map<string, EntrySummary>();
    for (const entry of entries) {
      if (!map.has(entry.dateKey)) map.set(entry.dateKey, entry);
    }
    return map;
  }, [entries]);
  const entryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) map.set(entry.dateKey, (map.get(entry.dateKey) ?? 0) + 1);
    return map;
  }, [entries]);
  const monthCount = entries.length;
  const yearMax = Math.max(1, ...yearCounts.map((item) => item.count));

  if (!month || !today || selectedDate === null) {
    return <DashboardSkeleton />;
  }

  const currentYear = month.getFullYear();

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);
    window.localStorage.setItem(localKeys.lastSelectedDate, dateKey);
  }

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{formatLongDate(today, locale)}</p>
          <h1 className="page-title">{t("calendarTitle")}</h1>
          <p className="page-subtitle">{t("calendarSubtitle")}</p>
        </div>
        <Link href={`/entry/${today}?new=1`} className="btn btn-primary btn-lg">
          <BookOpen size={17} />
          {t("createEntry")}
        </Link>
      </div>

      {stats && stats.totalEntries === 0 ? (
        <div className="card mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="eyebrow">{t("firstPrompt")}</p>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{t("firstPromptBody")}</p>
          </div>
          <Link href={`/entry/${today}?new=1`} className="btn btn-primary">
            <Sparkles size={15} />
            {t("createEntry")}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="card calendar-panel">
            <div className="calendar-header">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setMonth(addMonth(month, -1))}
                  aria-label={t("prevMonth")}
                >
                  <ChevronLeft size={17} />
                </button>
                <h2 className="min-w-[10.5rem] text-center font-serif text-lg font-semibold capitalize sm:min-w-[13rem] sm:text-xl">
                  {formatMonthYear(month, locale)}
                </h2>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setMonth(addMonth(month, 1))}
                  aria-label={t("nextMonth")}
                >
                  <ChevronRight size={17} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm ml-1"
                  onClick={() => {
                    const now = new Date();
                    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    selectDate(todayKey());
                  }}
                >
                  {t("today")}
                </button>
              </div>
              <div className="text-sm text-[var(--muted)]">
                <span className="font-serif text-lg font-semibold text-[var(--text)]">{monthCount}</span>{" "}
                {t("entriesThisMonth")}
              </div>
            </div>

            {error ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--card))] px-4 py-3 text-sm">
                <span>{error}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}>
                  {t("retry")}
                </button>
              </div>
            ) : null}

            <div className="calendar-grid mb-1">
              {weekdays.map((label, index) => (
                <div key={`${label}-${index}`} className="calendar-weekday">
                  {label}
                </div>
              ))}
            </div>

            {loading && entries.length === 0 ? (
              <MonthSkeleton />
            ) : (
              <div className="calendar-grid">
                {days.map((day) => {
                  const dateKey = toDateKey(day);
                  const entry = entryMap.get(dateKey);
                  const count = entryCounts.get(dateKey) ?? 0;
                  const outside = day.getMonth() !== month.getMonth();
                  const isToday = dateKey === today;
                  const selected = dateKey === selectedDate;
                  const mood = findMood(settings.moods, entry?.mood);
                  const image = settings.calendar.showThumbnails ? entry?.images[0] : undefined;
                  return (
                    <Link
                      key={dateKey}
                      href={`/entry/${dateKey}`}
                      className={cn(
                        "calendar-cell",
                        outside && "is-outside",
                        isToday && "is-today",
                        selected && "is-selected",
                        entry && "has-entry",
                        entry?.status === "draft" && "is-draft",
                        image && "has-thumb",
                      )}
                      onClick={() => selectDate(dateKey)}
                      aria-label={`${formatLongDate(dateKey, locale)}${entry ? ` — ${entry.title || t("hasEntry")}` : ""}`}
                    >
                      <div className="cell-topline">
                        <span className="day-number">{day.getDate()}</span>
                        {settings.calendar.showMood && mood ? (
                          <span className="cell-mood" title={moodLabel(mood, locale)} aria-hidden>
                            {mood.emoji}
                          </span>
                        ) : null}
                        {count > 1 ? <span className="cell-count">{count}</span> : null}
                      </div>
                      {image ? (
                        <span className="cell-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.url} alt="" loading="lazy" />
                        </span>
                      ) : null}
                      {entry?.title ? <span className="cell-title">{entry.title}</span> : null}
                      {entry ? <span className="entry-marker" aria-hidden /> : null}
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--today)]" />
                {t("today")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                {t("hasEntry")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border border-dashed border-[var(--muted)]" />
                {t("draftEntry")}
              </span>
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold">{t("yearOverview")}</h2>
                <p className="text-xs text-[var(--muted)]">{t("clickMonth")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setMonth(addMonth(month, -12))}
                  aria-label={t("previous")}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-serif text-base font-semibold">{currentYear}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setMonth(addMonth(month, 12))}
                  aria-label={t("next")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="year-grid">
              {Array.from({ length: 12 }, (_, index) => {
                const count = yearCounts[index]?.count ?? 0;
                const current = index + 1 === month.getMonth() + 1;
                return (
                  <button
                    key={index}
                    type="button"
                    className="year-month"
                    data-current={current}
                    onClick={() => setMonth(new Date(currentYear, index, 1))}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="year-month-name capitalize">{formatMonthShort(index, locale)}</span>
                      <span className="year-month-count">{count}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_16%,transparent)]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(count > 0 ? 8 : 0, (count / yearMax) * 100)}%`,
                          background: current ? "var(--today)" : "var(--primary)",
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold">{t("onThisDay")}</h2>
                <p className="text-xs text-[var(--muted)]">{formatLongDate(today, locale)}</p>
              </div>
              <Sparkles size={17} className="text-[var(--primary)]" />
            </div>
            {memories && memories.entries.length > 0 ? (
              <div className="space-y-2.5">
                {memories.entries.slice(0, 3).map((entry) => (
                  <EntryCard key={entry.id} entry={entry} className="items-center p-2.5" showYear />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--muted)]">{t("noMemories")}</p>
            )}
            <Link href="/memories" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
              {t("recentMemories")}
              <ArrowRight size={13} />
            </Link>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">{t("quickStats")}</h2>
              <CalendarDays size={17} className="text-[var(--muted)]" />
            </div>
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="stat-label">{t("totalEntries")}</p>
                  <p className="stat-value">{stats?.totalEntries ?? "—"}</p>
                </div>
                <span className="badge badge-primary">
                  {stats?.thisMonthEntries ?? 0} {t("entriesThisMonth")}
                </span>
              </div>
              <hr className="divider" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="stat-label flex items-center gap-1">
                    <Flame size={12} /> {t("currentStreak")}
                  </p>
                  <p className="mt-1 font-serif text-xl font-semibold">{stats?.currentStreak ?? 0}</p>
                </div>
                <div>
                  <p className="stat-label">{t("longestStreak")}</p>
                  <p className="mt-1 font-serif text-xl font-semibold">{stats?.longestStreak ?? 0}</p>
                </div>
              </div>
              <hr className="divider" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="stat-label">{t("wordsWritten")}</p>
                  <p className="mt-1 font-serif text-xl font-semibold">{stats?.totalWords ?? 0}</p>
                </div>
                <div>
                  <p className="stat-label">{t("photos")}</p>
                  <p className="mt-1 font-serif text-xl font-semibold">{stats?.photoCount ?? 0}</p>
                </div>
              </div>
            </div>
            <Link href="/stats" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
              {t("navStats")}
              <ArrowRight size={13} />
            </Link>
          </section>

          {memories?.recent && memories.recent.length > 0 ? (
            <section className="card p-5">
              <h2 className="mb-3 font-serif text-lg font-semibold">{t("recentMemories")}</h2>
              <div className="space-y-2.5">
                {memories.recent.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} className="items-center p-2.5" />
                ))}
              </div>
            </section>
          ) : null}

          {!stats && !error ? (
            <div className="card space-y-3 p-5">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-10 w-2/3" />
              <div className="skeleton h-4 w-full" />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
