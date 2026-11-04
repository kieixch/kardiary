import TurndownService from "turndown";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";
import { formatLongDate } from "@/lib/date";
import type { EntryDetail } from "@/lib/types";

function turndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    hr: "---",
  });
  service.keep(["u"]);
  return service;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function imageDataUri(imageId: string): Promise<string | null> {
  try {
    const record = await prisma.diaryImage.findUnique({ where: { id: imageId } });
    if (!record) return null;
    const buffer = await readStoredFile(record.storagePath);
    return `data:${record.mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export function entryMarkdown(entry: EntryDetail, locale: "id" | "en" = "id"): string {
  const lines: string[] = [];
  lines.push(`# ${entry.title?.trim() || formatLongDate(entry.dateKey, locale)}`);
  lines.push("");
  lines.push(`**${locale === "id" ? "Tanggal" : "Date"}:** ${entry.dateKey}`);
  lines.push(`**${locale === "id" ? "Jam" : "Time"}:** ${entry.time}`);
  if (entry.mood) lines.push(`**${locale === "id" ? "Suasana" : "Mood"}:** ${entry.mood}`);
  if (entry.location) lines.push(`**${locale === "id" ? "Lokasi" : "Location"}:** ${entry.location}`);
  if (entry.weather) lines.push(`**${locale === "id" ? "Cuaca" : "Weather"}:** ${entry.weather}`);
  if (entry.tags.length > 0) {
    lines.push(`**${locale === "id" ? "Tag" : "Tags"}:** ${entry.tags.map((tag) => `#${tag.name}`).join(" ")}`);
  }
  if (entry.highlights) {
    lines.push("");
    lines.push(`> ${entry.highlights}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(turndown().turndown(entry.content || ""));
  if (entry.images.length > 0) {
    lines.push("");
    lines.push(`## ${locale === "id" ? "Foto" : "Photos"}`);
    for (const image of entry.images) {
      lines.push("");
      lines.push(`![${image.caption || image.originalFilename}](${image.url})`);
      if (image.caption) lines.push(`*${image.caption}*`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function allEntriesMarkdown(entries: EntryDetail[], locale: "id" | "en" = "id"): string {
  return entries
    .slice()
    .sort((a, b) => `${a.dateKey} ${a.time}`.localeCompare(`${b.dateKey} ${b.time}`))
    .map((entry) => entryMarkdown(entry, locale))
    .join("\n\n---\n\n");
}

export async function printableHtml(entries: EntryDetail[], title: string): Promise<string> {
  const sections: string[] = [];
  for (const entry of entries
    .slice()
    .sort((a, b) => `${a.dateKey} ${a.time}`.localeCompare(`${b.dateKey} ${b.time}`))) {
    const imageHtml: string[] = [];
    for (const image of entry.images) {
      const data = await imageDataUri(image.id);
      if (data) {
        imageHtml.push(
          `<figure><img src="${data}" alt="${escapeHtml(image.caption || image.originalFilename)}" />${
            image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""
          }</figure>`,
        );
      }
    }
    sections.push(`
      <article>
        <header>
          <p class="date">${escapeHtml(entry.dateKey)} · ${escapeHtml(entry.time)}</p>
          <h1>${escapeHtml(entry.title || entry.dateKey)}</h1>
          <p class="meta">${entry.mood ? escapeHtml(entry.mood) : ""}${entry.location ? ` · ${escapeHtml(entry.location)}` : ""}${
            entry.weather ? ` · ${escapeHtml(entry.weather)}` : ""
          }</p>
        </header>
        ${entry.highlights ? `<blockquote>${escapeHtml(entry.highlights)}</blockquote>` : ""}
        <div class="content">${entry.content}</div>
        ${imageHtml.join("")}
      </article>
    `);
  }

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: Georgia, "Times New Roman", serif; background: #f6f1e8; color: #2e2a24; margin: 0; padding: 48px 20px; }
  main { max-width: 760px; margin: 0 auto; }
  article { background: #fffdf8; border: 1px solid #e3dacb; border-radius: 16px; padding: 40px; margin-bottom: 32px; box-shadow: 0 20px 60px -40px rgba(50,40,25,.5); }
  .date { letter-spacing: .12em; text-transform: uppercase; font-size: 12px; color: #8a8172; margin: 0 0 8px; }
  h1 { font-size: 30px; margin: 0 0 10px; }
  .meta { color: #7c7468; margin: 0 0 24px; font-style: italic; }
  blockquote { border-left: 3px solid #7f9270; margin: 0 0 24px; padding: 6px 18px; background: #f2f0e9; }
  .content { font-size: 17px; line-height: 1.8; }
  .content h1, .content h2, .content h3 { line-height: 1.25; }
  .content img { max-width: 100%; }
  figure { margin: 24px 0; }
  figure img { width: 100%; border-radius: 10px; display: block; }
  figcaption { font-size: 13px; color: #7c7468; margin-top: 8px; }
  hr { border: none; border-top: 1px solid #e3dacb; margin: 32px 0; }
  a { color: #5e6c84; }
  @media print { body { background: #fff; padding: 0; } article { box-shadow: none; border: none; page-break-after: always; } }
</style>
</head>
<body><main>${sections.join("\n")}</main></body>
</html>`;
}
