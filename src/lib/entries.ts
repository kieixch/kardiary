import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { cleanHtml, countWords, htmlToText } from "@/lib/sanitize";
import { entryInclude, serializeEntry, serializeEntryDetail, type EntryWithRelations } from "@/lib/serialize";
import { colorForName } from "@/lib/tag-colors";
import { copyStoredFile, deleteStoredFile } from "@/lib/storage";
import type { EntryCreateInput, EntryUpdateInput } from "@/lib/validation";
import type { EntryDetail, EntrySummary } from "@/lib/types";

export interface ListParams {
  q?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  mood?: string;
  tag?: string;
  hasImages?: "true" | "false";
  status?: "draft" | "published";
  sort?: "newest" | "oldest" | "updated";
  limit?: number;
  offset?: number;
}

export async function listEntries(params: ListParams): Promise<EntrySummary[]> {
  const where: Prisma.DiaryEntryWhereInput = {};
  const and: Prisma.DiaryEntryWhereInput[] = [];

  if (params.month) and.push({ dateKey: { startsWith: `${params.month}-` } });
  if (params.year) and.push({ dateKey: { startsWith: `${params.year}-` } });
  if (params.from) and.push({ dateKey: { gte: params.from } });
  if (params.to) and.push({ dateKey: { lte: params.to } });
  if (params.mood) and.push({ mood: params.mood });
  if (params.status) and.push({ status: params.status });
  if (params.hasImages === "true") and.push({ images: { some: {} } });
  if (params.hasImages === "false") and.push({ images: { none: {} } });
  if (params.tag) {
    and.push({
      tags: {
        some: {
          OR: [{ tagId: params.tag }, { tag: { name: params.tag } }],
        },
      },
    });
  }
  if (params.q) {
    const q = params.q.trim();
    if (q) {
      and.push({
        OR: [
          { title: { contains: q } },
          { contentText: { contains: q } },
          { location: { contains: q } },
          { tags: { some: { tag: { name: { contains: q } } } } },
        ],
      });
    }
  }
  if (and.length > 0) where.AND = and;

  const orderBy: Prisma.DiaryEntryOrderByWithRelationInput[] =
    params.sort === "oldest"
      ? [{ dateKey: "asc" }, { time: "asc" }, { createdAt: "asc" }]
      : params.sort === "updated"
        ? [{ updatedAt: "desc" }]
        : [{ dateKey: "desc" }, { time: "desc" }, { createdAt: "desc" }];

  const entries = await prisma.diaryEntry.findMany({
    where,
    include: entryInclude,
    orderBy,
    take: params.limit ?? 200,
    skip: params.offset ?? 0,
  });

  return entries.map((entry) => serializeEntry(entry, false) as EntrySummary);
}

export async function getEntriesByDate(dateKey: string): Promise<EntrySummary[]> {
  const entries = await prisma.diaryEntry.findMany({
    where: { dateKey },
    include: entryInclude,
    orderBy: [{ time: "desc" }, { createdAt: "desc" }],
  });
  return entries.map((entry) => serializeEntry(entry, false) as EntrySummary);
}

export async function getEntryById(id: string): Promise<EntryDetail | null> {
  const entry = await prisma.diaryEntry.findUnique({ where: { id }, include: entryInclude });
  return entry ? serializeEntryDetail(entry) : null;
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 20);
}

async function resolveTags(tx: Prisma.TransactionClient, names: string[]) {
  const records = [];
  for (const name of names) {
    const tag = await tx.tag.upsert({
      where: { name },
      update: {},
      create: { name, color: colorForName(name) },
    });
    records.push(tag);
  }
  return records;
}

async function syncTags(tx: Prisma.TransactionClient, entryId: string, names: string[]) {
  const tags = await resolveTags(tx, names);
  await tx.entryTag.deleteMany({ where: { entryId } });
  if (tags.length > 0) {
    await tx.entryTag.createMany({
      data: tags.map((tag) => ({ entryId, tagId: tag.id })),
    });
  }
}

export interface ImageRef {
  id: string;
  caption?: string | null;
  sortOrder: number;
}

async function syncImages(
  tx: Prisma.TransactionClient,
  entryId: string,
  images: ImageRef[],
): Promise<string[]> {
  const existing = await tx.diaryImage.findMany({ where: { entryId } });
  const uniqueImages = Array.from(new Map(images.map((image) => [image.id, image])).values());

  if (uniqueImages.length > 0) {
    const attachable = await tx.diaryImage.findMany({
      where: {
        id: { in: uniqueImages.map((image) => image.id) },
        OR: [{ entryId: null }, { entryId }],
      },
    });
    if (attachable.length !== uniqueImages.length) {
      throw new HttpError(400, "One or more images cannot be attached to this entry", "INVALID_IMAGE");
    }
  }

  for (const [index, image] of uniqueImages.entries()) {
    await tx.diaryImage.update({
      where: { id: image.id },
      data: {
        entryId,
        caption: image.caption?.slice(0, 300) || null,
        sortOrder: image.sortOrder ?? index,
      },
    });
  }

  const keepIds = new Set(uniqueImages.map((image) => image.id));
  const removed = existing.filter((image) => !keepIds.has(image.id));
  if (removed.length > 0) {
    await tx.diaryImage.deleteMany({ where: { id: { in: removed.map((image) => image.id) } } });
  }
  return removed.map((image) => image.storagePath);
}

function normalizedEntryContent(content: string | undefined): { content: string; contentText: string; wordCount: number } {
  const clean = cleanHtml(content ?? "");
  const text = htmlToText(clean);
  return { content: clean, contentText: text, wordCount: countWords(text) };
}

export async function createEntry(input: EntryCreateInput): Promise<EntryDetail> {
  const body = normalizedEntryContent(input.content);
  let removedPaths: string[] = [];
  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.diaryEntry.create({
      data: {
        dateKey: input.dateKey,
        time: input.time ?? new Date().toTimeString().slice(0, 5),
        title: input.title?.trim() || null,
        content: body.content,
        contentText: body.contentText,
        wordCount: body.wordCount,
        mood: input.mood || null,
        location: input.location?.trim() || null,
        weather: input.weather?.trim() || null,
        highlights: input.highlights?.trim() || null,
        status: input.status ?? "published",
      },
    });
    if (input.tags) await syncTags(tx, created.id, normalizeTags(input.tags));
    if (input.images) removedPaths = await syncImages(tx, created.id, input.images);
    return tx.diaryEntry.findUniqueOrThrow({ where: { id: created.id }, include: entryInclude });
  });

  for (const path of removedPaths) await deleteStoredFile(path);
  return serializeEntryDetail(entry);
}

export async function updateEntry(id: string, input: EntryUpdateInput): Promise<EntryDetail> {
  const existing = await prisma.diaryEntry.findUnique({ where: { id }, include: entryInclude });
  if (!existing) throw new HttpError(404, "Entry not found", "NOT_FOUND");

  const body = input.content !== undefined ? normalizedEntryContent(input.content) : null;
  let removedPaths: string[] = [];

  const entry = await prisma.$transaction(async (tx) => {
    await tx.diaryEntry.update({
      where: { id },
      data: {
        ...(input.time !== undefined ? { time: input.time } : {}),
        ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
        ...(body ? { content: body.content, contentText: body.contentText, wordCount: body.wordCount } : {}),
        ...(input.mood !== undefined ? { mood: input.mood || null } : {}),
        ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
        ...(input.weather !== undefined ? { weather: input.weather?.trim() || null } : {}),
        ...(input.highlights !== undefined ? { highlights: input.highlights?.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    if (input.tags !== undefined) await syncTags(tx, id, normalizeTags(input.tags));
    if (input.images !== undefined) removedPaths = await syncImages(tx, id, input.images);
    return tx.diaryEntry.findUniqueOrThrow({ where: { id }, include: entryInclude });
  });

  for (const path of removedPaths) await deleteStoredFile(path);
  return serializeEntryDetail(entry);
}

export async function deleteEntry(id: string): Promise<void> {
  const entry = await prisma.diaryEntry.findUnique({ where: { id }, include: entryInclude });
  if (!entry) throw new HttpError(404, "Entry not found", "NOT_FOUND");
  await prisma.diaryEntry.delete({ where: { id } });
  for (const image of entry.images) {
    await deleteStoredFile(image.storagePath);
  }
}

export async function duplicateEntry(id: string, targetDate: string): Promise<EntryDetail> {
  const source = await prisma.diaryEntry.findUnique({ where: { id }, include: entryInclude });
  if (!source) throw new HttpError(404, "Entry not found", "NOT_FOUND");

  const copiedPaths: string[] = [];
  try {
    const imageCopies = [];
    for (const image of source.images) {
      const newPath = await copyStoredFile(image.storagePath);
      copiedPaths.push(newPath);
      imageCopies.push({
        storagePath: newPath,
        originalFilename: image.originalFilename,
        mimeType: image.mimeType,
        fileSize: image.fileSize,
        width: image.width,
        height: image.height,
        caption: image.caption,
        sortOrder: image.sortOrder,
      });
    }

    const created = await prisma.diaryEntry.create({
      data: {
        dateKey: targetDate,
        time: source.time,
        title: source.title,
        content: source.content,
        contentText: source.contentText,
        wordCount: source.wordCount,
        mood: source.mood,
        location: source.location,
        weather: source.weather,
        highlights: source.highlights,
        status: source.status,
        tags: { create: source.tags.map((entryTag) => ({ tag: { connect: { id: entryTag.tagId } } })) },
        images: { create: imageCopies },
      },
      include: entryInclude,
    });
    return serializeEntryDetail(created);
  } catch (error) {
    for (const path of copiedPaths) await deleteStoredFile(path);
    throw error;
  }
}

export async function findEntryWithRelations(id: string): Promise<EntryWithRelations | null> {
  return prisma.diaryEntry.findUnique({ where: { id }, include: entryInclude });
}
