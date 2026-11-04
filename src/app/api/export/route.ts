import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/db";
import { allEntriesMarkdown, imageDataUri, printableHtml } from "@/lib/export";
import { errorResponse } from "@/lib/http";
import { tagDto, entryInclude, serializeEntryDetail } from "@/lib/serialize";
import { getSettings } from "@/lib/settings-store";
import { todayKey } from "@/lib/date";

export async function GET(request: Request) {
  await connection();
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const locale = url.searchParams.get("locale") === "en" ? "en" : "id";

    const records = await prisma.diaryEntry.findMany({
      include: entryInclude,
      orderBy: { dateKey: "asc" },
    });
    const entries = records.map(serializeEntryDetail);

    if (format === "md") {
      return new NextResponse(`# KARDIARY\n\n${allEntriesMarkdown(entries, locale)}`, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="kardiary-${todayKey()}.md"`,
        },
      });
    }

    if (format === "html") {
      const html = await printableHtml(entries, "KARDIARY");
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="kardiary-${todayKey()}.html"`,
        },
      });
    }

    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    const { settings } = await getSettings();
    const backupEntries = [];
    for (const entry of entries) {
      const images = [];
      for (const image of entry.images) {
        images.push({
          ...image,
          dataBase64: (await imageDataUri(image.id)) ?? undefined,
        });
      }
      backupEntries.push({ ...entry, images });
    }

    const payload = {
      app: "kardiary",
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: backupEntries,
      tags: tags.map((tag) => tagDto(tag)),
      settings,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="kardiary-backup-${todayKey()}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
