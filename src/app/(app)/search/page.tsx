"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, RotateCcw, Search, Tag as TagIcon } from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { EntryCard } from "@/components/entry/entry-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { EntrySummary, TagDTO } from "@/lib/types";

type ImageFilter = "" | "true" | "false";

export default function SearchPage() {
  const { settings, locale, t } = useAppearance();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const [mood, setMood] = useState("");
  const [tag, setTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [imageFilter, setImageFilter] = useState<ImageFilter>("");
  const [sort, setSort] = useState<"newest" | "oldest" | "updated">("newest");
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [results, setResults] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const hasCriteria = Boolean(
    debouncedQuery.trim() || mood || tag || from || to || imageFilter,
  );

  useEffect(() => {
    api
      .listTags()
      .then((result) => setTags(result.tags))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasCriteria) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listEntries({
        q: debouncedQuery.trim() || undefined,
        mood: mood || undefined,
        tag: tag || undefined,
        from: from || undefined,
        to: to || undefined,
        hasImages: imageFilter || undefined,
        sort,
        limit: 200,
      })
      .then((result) => {
        if (!cancelled) setResults(result.entries);
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
  }, [debouncedQuery, mood, tag, from, to, imageFilter, sort, hasCriteria, reload, t]);

  const enabledMoods = useMemo(() => settings.moods.filter((item) => item.enabled), [settings.moods]);
  const filterCount = [mood, tag, from, to, imageFilter].filter(Boolean).length;

  function clearFilters() {
    setQuery("");
    setMood("");
    setTag("");
    setFrom("");
    setTo("");
    setImageFilter("");
    setSort("newest");
  }

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={t("navSearch")}
        title={t("searchTitle")}
        subtitle={t("searchSubtitle")}
        actions={
          hasCriteria ? (
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              <RotateCcw size={15} />
              {t("clearFilters")}
            </button>
          ) : null
        }
      />

      <div className="card mb-5 flex items-center gap-3 p-2.5">
        <Search size={19} className="ml-2 flex-shrink-0 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 border-none bg-transparent py-2 text-base outline-none placeholder:text-[var(--muted)]"
          autoFocus
        />
        {query !== debouncedQuery || loading ? (
          <Loader2 size={16} className="mr-2 animate-spin text-[var(--muted)]" />
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <div className="card p-5 lg:sticky lg:top-20">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-base font-semibold">
                <Filter size={15} />
                {t("filters")}
              </h2>
              {filterCount > 0 ? <span className="badge badge-primary">{filterCount}</span> : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="moodFilter">
                  {t("moodFilter")}
                </label>
                <select
                  id="moodFilter"
                  value={mood}
                  onChange={(event) => setMood(event.target.value)}
                  className="select"
                >
                  <option value="">{t("searchAll")}</option>
                  {enabledMoods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.emoji} {locale === "id" ? item.label : item.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="tagFilter">
                  {t("tagFilter")}
                </label>
                <select
                  id="tagFilter"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  className="select"
                >
                  <option value="">{t("all")}</option>
                  {tags.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.count ? ` (${item.count})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="fromDate">
                    {t("fromDate")}
                  </label>
                  <input
                    id="fromDate"
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="toDate">
                    {t("toDate")}
                  </label>
                  <input
                    id="toDate"
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="imageFilter">
                  {t("hasImages")}
                </label>
                <select
                  id="imageFilter"
                  value={imageFilter}
                  onChange={(event) => setImageFilter(event.target.value as ImageFilter)}
                  className="select"
                >
                  <option value="">{t("anyImages")}</option>
                  <option value="true">{t("onlyImages")}</option>
                  <option value="false">{t("noImagesFilter")}</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="sortBy">
                  {t("sortBy")}
                </label>
                <select
                  id="sortBy"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as typeof sort)}
                  className="select"
                >
                  <option value="newest">{t("sortNewest")}</option>
                  <option value="oldest">{t("sortOldest")}</option>
                  <option value="updated">{t("sortUpdated")}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.68rem] text-[var(--muted)]">
                <TagIcon size={13} />
                {t("searchHint")}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {error ? (
            <div className="card mb-3 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <span>{error}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}>
                {t("retry")}
              </button>
            </div>
          ) : null}

          {!hasCriteria ? (
            <EmptyState
              title={t("searchTitle")}
              description={t("searchHint")}
              icon={<Search size={20} />}
            />
          ) : loading && results.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="skeleton h-32 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              title={t("noResults")}
              description={t("noResultsHint")}
              icon={<Search size={20} />}
              action={
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  {t("clearFilters")}
                </button>
              }
            />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">{t("searchResults")}</h2>
                <span className="text-xs text-[var(--muted)]">
                  {results.length} {t("resultCount")}
                  {results.length === 200 ? "+" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {results.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
