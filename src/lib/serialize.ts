import type { Prisma } from "@prisma/client";
import type { EntryDetail, EntryImageDTO, EntrySummary, TagDTO } from "@/lib/types";
import { excerptFromText } from "@/lib/sanitize";
import type { EntryStatus } from "@/lib/types";

export const entryInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  tags: { include: { tag: true } },
} satisfies Prisma.DiaryEntryInclude;

export type EntryWithRelations = Prisma.DiaryEntryGetPayload<{ include: typeof entryInclude }>;

export function imageDto(image: EntryWithRelations["images"][number]): EntryImageDTO {
  return {
    id: image.id,
    url: `/api/images/${image.id}`,
    caption: image.caption,
    sortOrder: image.sortOrder,
    width: image.width,
    height: image.height,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
    originalFilename: image.originalFilename,
    createdAt: image.createdAt.toISOString(),
  };
}

export function tagDto(tag: { id: string; name: string; color: string; count?: number }): TagDTO {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    ...(typeof tag.count === "number" ? { count: tag.count } : {}),
  };
}

export function serializeEntry(entry: EntryWithRelations, includeContent = true): EntryDetail | EntrySummary {
  const base: EntrySummary = {
    id: entry.id,
    dateKey: entry.dateKey,
    time: entry.time,
    title: entry.title,
    excerpt: excerptFromText(entry.contentText, 180),
    wordCount: entry.wordCount,
    mood: entry.mood,
    status: (entry.status === "draft" ? "draft" : "published") as EntryStatus,
    location: entry.location,
    weather: entry.weather,
    highlights: entry.highlights,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    images: entry.images.map(imageDto),
    tags: entry.tags.map((entryTag) => tagDto(entryTag.tag)),
  };

  if (!includeContent) return base;

  return {
    ...base,
    content: entry.content,
    contentText: entry.contentText,
  };
}

export function serializeEntryDetail(entry: EntryWithRelations): EntryDetail {
  return serializeEntry(entry, true) as EntryDetail;
}
