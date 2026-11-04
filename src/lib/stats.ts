import { format, subMonths } from "date-fns";
import { prisma } from "@/lib/db";
import { shiftDateKey, todayKey } from "@/lib/date";
import { tagDto } from "@/lib/serialize";
import type { FullStats } from "@/lib/types";

export async function computeStats(): Promise<FullStats> {
  const [entries, images, drafts, tags] = await Promise.all([
    prisma.diaryEntry.findMany({
      select: { dateKey: true, mood: true, wordCount: true },
      orderBy: { dateKey: "asc" },
    }),
    prisma.diaryImage.count({ where: { entryId: { not: null } } }),
    prisma.diaryEntry.count({ where: { status: "draft" } }),
    prisma.tag.findMany({ include: { _count: { select: { entries: true } } } }),
  ]);

  const dateKeys = Array.from(new Set(entries.map((entry) => entry.dateKey))).sort();
  const keySet = new Set(dateKeys);

  let currentStreak = 0;
  let cursor = todayKey();
  if (!keySet.has(cursor)) cursor = shiftDateKey(cursor, -1);
  while (keySet.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  let longestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of dateKeys) {
    if (previous && key === shiftDateKey(previous, 1)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    previous = key;
  }

  const now = new Date();
  const monthKeys = Array.from({ length: 18 }, (_, index) =>
    format(subMonths(now, 17 - index), "yyyy-MM"),
  );
  const monthCounts = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.dateKey.slice(0, 7);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }

  const moodCounts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.mood) continue;
    moodCounts.set(entry.mood, (moodCounts.get(entry.mood) ?? 0) + 1);
  }

  const moodDistribution = Array.from(moodCounts.entries())
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);

  const topTags = tags
    .filter((tag) => tag._count.entries > 0)
    .sort((a, b) => b._count.entries - a._count.entries)
    .slice(0, 8)
    .map((tag) => tagDto({ id: tag.id, name: tag.name, color: tag.color, count: tag._count.entries }));

  const currentMonth = format(now, "yyyy-MM");
  const thisMonthEntries = entries.filter((entry) => entry.dateKey.startsWith(currentMonth)).length;
  const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);

  return {
    totalEntries: entries.length,
    drafts,
    photoCount: images,
    totalWords,
    currentStreak,
    longestStreak,
    thisMonthEntries,
    topMood: moodDistribution[0]?.mood ?? null,
    entriesByMonth: monthKeys.map((key) => ({
      key,
      month: Number(key.slice(5, 7)),
      count: monthCounts.get(key) ?? 0,
    })),
    moodDistribution,
    topTags,
    firstEntryDate: dateKeys[0] ?? null,
    lastEntryDate: dateKeys[dateKeys.length - 1] ?? null,
  };
}
