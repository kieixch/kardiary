import { NextResponse, connection } from "next/server";
import { getEntryById } from "@/lib/entries";
import { entryMarkdown, imageDataUri, printableHtml } from "@/lib/export";
import { errorResponse } from "@/lib/http";
import { safeFilename } from "@/lib/utils";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  await connection();
  try {
    const { id } = await params;
    const entry = await getEntryById(id);
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const baseFilename = safeFilename(`${entry.dateKey}-${entry.title || "diary"}`).slice(0, 80);

    if (format === "md") {
      return new NextResponse(entryMarkdown(entry), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseFilename}.md"`,
        },
      });
    }

    if (format === "html") {
      const html = await printableHtml([entry], baseFilename);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseFilename}.html"`,
        },
      });
    }

    const images = await Promise.all(
      entry.images.map(async (image) => ({
        ...image,
        dataBase64: (await imageDataUri(image.id)) ?? undefined,
      })),
    );
    const payload = {
      app: "kardiary",
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: [{ ...entry, images }],
      tags: entry.tags,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseFilename}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
