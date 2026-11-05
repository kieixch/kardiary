"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Camera, FileText, Flame, PenLine, Tag as TagIcon } from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import { formatMediumDate, formatMonthShort } from "@/lib/date";
import { findMood, moodLabel } from "@/lib/moods";
import type { FullStats } from "@/lib/types";

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-2">{value}</p>
          {hint ? <p className="mt-1 text-[0.68rem] text-[var(--muted)]">{hint}</p> : null}
        </div>
        <span className="text-[var(--primary)]">{icon}</span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { settings, locale, t } = useAppearance();
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getStats()
      .then((result) => {
        if (!cancelled) setStats(result.stats);
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
  }, [reload, t]);

  const months = useMemo(() => stats?.entriesByMonth ?? [], [stats]);
  const maxMonth = Math.max(1, ...months.map((month) => month.count));
  const moodTotal = (stats?.moodDistribution ?? []).reduce((sum, item) => sum + item.count, 0);
  const averageWords =
    stats && stats.totalEntries > 0 ? Math.round(stats.totalWords / stats.totalEntries) : 0;
  const topMood = findMood(settings.moods, stats?.topMood);

  return (
    <div className="fade-up stats-page">
      <PageHeader
        eyebrow={t("navStats")}
        title={t("statsTitle")}
        subtitle={t("statsSubtitle")}
        actions={
          <Link href="/" className="btn btn-secondary">
            {t("openCalendar")}
          </Link>
        }
      />

      {error ? (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}>
            {t("retry")}
          </button>
        </div>
      ) : null}

      {loading && !stats ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="skeleton h-28" />
            ))}
          </div>
          <div className="skeleton h-64 w-full" />
        </div>
      ) : !stats || stats.totalEntries === 0 ? (
        <EmptyState
          title={t("noStats")}
          description={t("firstPromptBody")}
          icon={<PenLine size={20} />}
          action={
            <Link href="/" className="btn btn-primary">
              <BookOpen size={15} />
              {t("createEntry")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={t("totalEntries")}
              value={stats.totalEntries}
              hint={`${stats.thisMonthEntries} ${t("entriesThisMonth")}`}
              icon={<BookOpen size={18} />}
            />
            <StatCard
              label={t("wordsWritten")}
              value={stats.totalWords.toLocaleString(locale === "id" ? "id-ID" : "en-US")}
              hint={`${averageWords} ${t("wordsPerEntry")}`}
              icon={<FileText size={18} />}
            />
            <StatCard
              label={t("photosSaved")}
              value={stats.photoCount}
              icon={<Camera size={18} />}
            />
            <StatCard
              label={t("currentStreak")}
              value={stats.currentStreak}
              hint={t("writingDays")}
              icon={<Flame size={18} />}
            />
            <StatCard
              label={t("longestStreakLabel")}
              value={stats.longestStreak}
              hint={t("writingDays")}
              icon={<Flame size={18} />}
            />
            <StatCard
              label={t("draftsCount")}
              value={stats.drafts}
              hint={stats.drafts === 0 ? t("noDrafts") : undefined}
              icon={<PenLine size={18} />}
            />
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              <section className="card p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg font-semibold">{t("entriesByMonth")}</h2>
                    <p className="text-xs text-[var(--muted)]">{t("allTime")}</p>
                  </div>
                  <span className="badge">{t("thisYear")}</span>
                </div>
                <div className="stat-chart-scroll">
                  <div className="bar-chart">
                    {months.map((month) => {
                      const monthNumber = Number(month.key.slice(5, 7));
                      const yearShort = month.key.slice(2, 4);
                      const height = month.count === 0 ? 2 : Math.max(6, (month.count / maxMonth) * 100);
                      return (
                        <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                          <span className="text-[0.58rem] font-medium text-[var(--muted)]">{month.count || ""}</span>
                          <div
                            className="bar w-full"
                            style={{ height: `${height}%` }}
                            title={`${month.key}: ${month.count} ${t("entries")}`}
                          />
                          <span className="text-[0.55rem] text-[var(--muted)]">
                            {formatMonthShort(monthNumber - 1, locale)}
                            <span className="hidden sm:inline"> &apos;{yearShort}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="card p-5 sm:p-6">
                <h2 className="mb-4 font-serif text-lg font-semibold">{t("moodDistribution")}</h2>
                {stats.moodDistribution.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">{t("noStats")}</p>
                ) : (
                  <div className="space-y-3">
                    {stats.moodDistribution.map((item) => {
                      const mood = findMood(settings.moods, item.mood);
                      const percentage = moodTotal > 0 ? Math.round((item.count / moodTotal) * 100) : 0;
                      return (
                        <div key={item.mood}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2">
                              <span aria-hidden>{mood?.emoji ?? "•"}</span>
                              {mood ? moodLabel(mood, locale) : item.mood}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {item.count} · {percentage}%
                            </span>
                          </div>
                          <div className="mood-bar">
                            <span
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: mood?.color ?? "var(--primary)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="min-w-0 space-y-5">
              <section className="card p-5">
                <h2 className="mb-4 font-serif text-lg font-semibold">{t("topTags")}</h2>
                {stats.topTags.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">{t("none")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${tag.color}1f`,
                          border: `1px solid ${tag.color}66`,
                        }}
                      >
                        <TagIcon size={11} style={{ color: tag.color }} />
                        {tag.name}
                        <span className="text-[var(--muted)]">{tag.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="card p-5">
                <h2 className="mb-3 font-serif text-lg font-semibold">{t("quickStats")}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)]">{t("firstEntry")}</span>
                    <span>{stats.firstEntryDate ? formatMediumDate(stats.firstEntryDate, locale) : "—"}</span>
                  </div>
                  <hr className="divider" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)]">{t("lastEntry")}</span>
                    <span>{stats.lastEntryDate ? formatMediumDate(stats.lastEntryDate, locale) : "—"}</span>
                  </div>
                  <hr className="divider" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)]">{t("topTags")}</span>
                    <span>
                      {topMood ? `${topMood.emoji} ${moodLabel(topMood, locale)}` : "—"}
                    </span>
                  </div>
                  <hr className="divider" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)]">{t("wordsPerEntry")}</span>
                    <span>{averageWords}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
