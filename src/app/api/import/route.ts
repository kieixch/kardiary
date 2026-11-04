import { NextResponse } from "next/server";
import { normalizeSettings } from "@/lib/appearance";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { cleanHtml, countWords, htmlToText } from "@/lib/sanitize";
import { colorForName } from "@/lib/tag-colors";
import {
  deleteStoredFile,
  inspectImageBuffer,
  saveBase64Image,
  type StoredImage,
} from "@/lib/storage";
import { importRequestSchema } from "@/lib/validation";
import type { ImportResult } from "@/lib/types";

export const maxDuration = 300;

interface PreparedImage extends StoredImage {
  caption: string | null;
  sortOrder: number;
}

interface PreparedEntry {
  dateKey: string;
  time: string;
  title: string | null;
  content: string;
  contentText: string;
  wordCount: number;
  mood: string | null;
  location: string | null;
  weather: string | null;
  highlights: string | null;
  status: string;
  tags: { name: string; color: string }[];
  images: PreparedImage[];
}

function decodeBase64(value: string): Buffer {
  const base64 = value.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) throw new Error("Invalid base64 image data");
  return Buffer.from(base64, "base64");
}

function normalizeTagNames(
  entryTags: (string | { name: string; color?: string })[] | undefined,
  globalTags: { name: string; color?: string }[] | undefined,
): { name: string; color: string }[] {
  const globalMap = new Map((globalTags ?? []).map((tag) => [tag.name.toLowerCase(), tag]));
  const seen = new Set<string>();
  const result: { name: string; color: string }[] = [];
  for (const tag of entryTags ?? []) {
    const name = (typeof tag === "string" ? tag : tag.name).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const color = typeof tag === "string" ? undefined : tag.color;
    const global = globalMap.get(key);
    result.push({ name, color: color ?? global?.color ?? colorForName(name) });
  }
  return result;
}

function entryKey(dateKey: string, time: string): string {
  return `${dateKey}|${time}`;
}

export async function POST(request: Request) {
  const newFiles: string[] = [];
  try {
    const raw = await readJson(request);
    const { data, strategy = "skip", dryRun = false, applySettings = false } = importRequestSchema.parse(raw);

    const dateKeys = data.entries.map((entry) => entry.dateKey);
    const existing = await prisma.diaryEntry.findMany({
      where: { dateKey: { in: dateKeys } },
      include: { images: true },
    });
    const existingMap = new Map(existing.map((entry) => [entryKey(entry.dateKey, entry.time), entry]));
    const duplicates = data.entries
      .filter((entry) => existingMap.has(entryKey(entry.dateKey, entry.time ?? "12:00")))
      .map((entry) => `${entry.dateKey} ${entry.time ?? "12:00"}`);

    if (dryRun) {
      let imageCount = 0;
      const errors: string[] = [];
      for (const entry of data.entries) {
        for (const image of entry.images ?? []) {
          if (!image.dataBase64) continue;
          imageCount += 1;
          try {
            await inspectImageBuffer(decodeBase64(image.dataBase64));
          } catch (error) {
            errors.push(`${entry.dateKey}: ${error instanceof Error ? error.message : "invalid image"}`);
          }
        }
      }
      const result: ImportResult = {
        detected: data.entries.length,
        imported: 0,
        skipped: 0,
        overwritten: 0,
        images: imageCount,
        duplicates,
        valid: errors.length === 0,
        errors,
      };
      return NextResponse.json({ result });
    }

    const entriesToImport = data.entries.filter((entry) => {
      const key = entryKey(entry.dateKey, entry.time ?? "12:00");
      if (!existingMap.has(key)) return true;
      return strategy === "overwrite";
    });
    const skipped = data.entries.length - entriesToImport.length;

    const prepared: PreparedEntry[] = [];
    let imageCount = 0;

    try {
      for (const entry of entriesToImport) {
        const content = cleanHtml(entry.content ?? "");
        const contentText = htmlToText(content);
        const preparedImages: PreparedImage[] = [];
        for (const [index, image] of (entry.images ?? []).entries()) {
          if (!image.dataBase64) continue;
          const stored = await saveBase64Image(image.dataBase64, image.originalFilename, image.mimeType);
          newFiles.push(stored.storagePath);
          imageCount += 1;
          preparedImages.push({
            ...stored,
            caption: image.caption ?? null,
            sortOrder: image.sortOrder ?? index,
          });
        }
        prepared.push({
          dateKey: entry.dateKey,
          time: entry.time ?? "12:00",
          title: entry.title?.trim() || null,
          content,
          contentText,
          wordCount: countWords(contentText),
          mood: entry.mood || null,
          location: entry.location?.trim() || null,
          weather: entry.weather?.trim() || null,
          highlights: entry.highlights?.trim() || null,
          status: entry.status === "draft" ? "draft" : "published",
          tags: normalizeTagNames(entry.tags, data.tags),
          images: preparedImages,
        });
      }
    } catch (error) {
      for (const path of newFiles) await deleteStoredFile(path);
      throw error instanceof HttpError
        ? error
        : new HttpError(400, `Backup validation failed: ${error instanceof Error ? error.message : "invalid image"}`, "IMPORT_INVALID");
    }

    const oldFilesToDelete: string[] = [];
    let overwritten = 0;

    try {
      await prisma.$transaction(
        async (tx) => {
          for (const entry of prepared) {
            const previous = existingMap.get(entryKey(entry.dateKey, entry.time));
            if (previous) {
              overwritten += 1;
              oldFilesToDelete.push(...previous.images.map((image) => image.storagePath));
              await tx.diaryEntry.delete({ where: { id: previous.id } });
            }

            const tagIds: string[] = [];
            for (const tag of entry.tags) {
              const record = await tx.tag.upsert({
                where: { name: tag.name },
                update: {},
                create: { name: tag.name, color: tag.color },
              });
              tagIds.push(record.id);
            }

            await tx.diaryEntry.create({
              data: {
                dateKey: entry.dateKey,
                time: entry.time,
                title: entry.title,
                content: entry.content,
                contentText: entry.contentText,
                wordCount: entry.wordCount,
                mood: entry.mood,
                location: entry.location,
                weather: entry.weather,
                highlights: entry.highlights,
                status: entry.status,
                images: {
                  create: entry.images.map((image) => ({
                    storagePath: image.storagePath,
                    originalFilename: image.originalFilename,
                    mimeType: image.mimeType,
                    fileSize: image.fileSize,
                    width: image.width,
                    height: image.height,
                    caption: image.caption,
                    sortOrder: image.sortOrder,
                  })),
                },
                tags: { create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) },
              },
            });
          }

          if (applySettings && data.settings) {
            const settings = normalizeSettings(data.settings);
            await tx.diarySettings.upsert({
              where: { id: "default" },
              update: { data: JSON.stringify(settings), locale: settings.locale },
              create: { id: "default", data: JSON.stringify(settings), locale: settings.locale },
            });
          }
        },
        { maxWait: 15000, timeout: 120000 },
      );
    } catch (error) {
      for (const path of newFiles) await deleteStoredFile(path);
      throw new HttpError(500, `Import failed and was rolled back: ${error instanceof Error ? error.message : "database error"}`, "IMPORT_FAILED");
    }

    for (const path of oldFilesToDelete) await deleteStoredFile(path);

    const result: ImportResult = {
      detected: data.entries.length,
      imported: prepared.length - overwritten,
      skipped,
      overwritten,
      images: imageCount,
      duplicates,
      valid: true,
    };
    return NextResponse.json({ result });
  } catch (error) {
    for (const path of newFiles) await deleteStoredFile(path);
    return errorResponse(error);
  }
}
