import { prisma } from "@/lib/db";
import { entryInclude, serializeEntry } from "@/lib/serialize";
import type { EntrySummary } from "@/lib/types";

export async function getMemories(dateKey: string): Promise<EntrySummary[]> {
  const monthDay = dateKey.slice(5);
  const entries = await prisma.diaryEntry.findMany({
    where: {
      dateKey: { endsWith: `-${monthDay}`, not: dateKey },
      OR: [{ content: { not: "" } }, { title: { not: null } }, { images: { some: {} } }],
    },
    include: entryInclude,
    orderBy: { dateKey: "desc" },
    take: 50,
  });
  return entries.map((entry) => serializeEntry(entry, false) as EntrySummary);
}

export async function getRecentMemories(limit = 3): Promise<EntrySummary[]> {
  const entries = await prisma.diaryEntry.findMany({
    where: {
      OR: [{ content: { not: "" } }, { title: { not: null } }, { images: { some: {} } }],
    },
    include: entryInclude,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return entries.map((entry) => serializeEntry(entry, false) as EntrySummary);
}
