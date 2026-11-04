"use client";

import Link from "next/link";
import { Camera, Clock } from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { dayOfDateKey, formatLongDate, formatMediumDate, monthOfDateKey } from "@/lib/date";
import { findMood, moodLabel } from "@/lib/moods";
import type { EntrySummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EntryCardProps {
  entry: EntrySummary;
  className?: string;
  showYear?: boolean;
  onSelect?: () => void;
}

export function EntryCard({ entry, className, showYear, onSelect }: EntryCardProps) {
  const { settings, locale, t } = useAppearance();
  const mood = findMood(settings.moods, entry.mood);
  const image = entry.images[0];
  const dateLabel = formatLongDate(entry.dateKey, locale);
  const title = entry.title || formatMediumDate(entry.dateKey, locale);

  return (
    <Link
      href={`/entry/${entry.dateKey}?id=${entry.id}`}
      className={cn("search-result", className)}
      onClick={(event) => {
        if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        onSelect();
      }}
    >
      <div className="search-thumb relative flex flex-col items-center justify-center overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.caption || entry.title || dateLabel} loading="lazy" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[color-mix(in_srgb,var(--selected)_55%,var(--card))]">
            <span className="font-serif text-xl leading-none">{dayOfDateKey(entry.dateKey)}</span>
            <span className="mt-1 text-[0.56rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {formatMediumDate(entry.dateKey, locale).split(" ")[1] ?? monthOfDateKey(entry.dateKey)}
            </span>
          </div>
        )}
        {entry.images.length > 1 ? (
          <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[0.56rem] font-semibold text-white">
            <Camera size={9} />
            {entry.images.length}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] text-[var(--muted)]">
          <span className="font-semibold uppercase tracking-[0.08em]">{formatMediumDate(entry.dateKey, locale)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={10} />
            {entry.time}
          </span>
          {showYear ? (
            <span className="rounded-full border border-[var(--border)] px-1.5 py-0.5">{entry.dateKey.slice(0, 4)}</span>
          ) : null}
          {entry.status === "draft" ? <span className="badge">{t("draft")}</span> : null}
          {mood ? (
            <span className="inline-flex items-center gap-1" title={moodLabel(mood, locale)}>
              <span aria-hidden>{mood.emoji}</span>
              {moodLabel(mood, locale)}
            </span>
          ) : null}
        </div>

        <h3 className="mt-1 truncate font-serif text-[1.05rem] font-semibold leading-snug">{title}</h3>

        {entry.excerpt ? (
          <p className="mt-1 line-clamp-2 text-[0.82rem] leading-relaxed text-[var(--muted)]">{entry.excerpt}</p>
        ) : null}

        {entry.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-[0.64rem] font-medium"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
            {entry.tags.length > 3 ? (
              <span className="text-[0.64rem] text-[var(--muted)]">+{entry.tags.length - 3}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
