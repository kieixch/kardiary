import type { AppearanceSettings } from "@/lib/appearance";
import type {
  EntryDetail,
  EntrySummary,
  FullStats,
  ImportResult,
  TagDTO,
} from "@/lib/types";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const VERCEL_SAFE_UPLOAD_BYTES = 3.5 * 1024 * 1024;

function withExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]+$/, "").trim() || "image";
  return `${base}.${extension}`;
}

function extensionForType(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  return "webp";
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeImageForUpload(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (file.size <= VERCEL_SAFE_UPLOAD_BYTES) return file;
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    let smallest: Blob | null = null;

    for (const maxDimension of [2560, 1920, 1440, 1080]) {
      const scale = Math.min(1, maxDimension / longestSide);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.74, 0.62]) {
        const blob = await canvasToBlob(canvas, "image/webp", quality);
        if (!blob) continue;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= VERCEL_SAFE_UPLOAD_BYTES) {
          const type = blob.type || "image/webp";
          return new File([blob], withExtension(file.name, extensionForType(type)), {
            type,
            lastModified: file.lastModified,
          });
        }
      }
    }

    if (smallest && smallest.size < file.size) {
      const type = smallest.type || "image/webp";
      return new File([smallest], withExtension(file.name, extensionForType(type)), {
        type,
        lastModified: file.lastModified,
      });
    }
    return file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as Record<string, unknown> | null)
    : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload.error === "string" && payload.error) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(
      message,
      response.status,
      payload && typeof payload.code === "string" ? payload.code : undefined,
      payload?.details,
    );
  }

  return payload as T;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export interface EntryFormPayload {
  dateKey?: string;
  time?: string;
  title?: string | null;
  content?: string;
  mood?: string | null;
  location?: string | null;
  weather?: string | null;
  highlights?: string | null;
  status?: "draft" | "published";
  tags?: string[];
  images?: { id: string; caption?: string | null; sortOrder: number }[];
}

export interface EntryQuery {
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

export interface MemoriesPayload {
  date: string;
  entries: EntrySummary[];
  recent?: EntrySummary[];
}

export interface ImportPreview {
  result: ImportResult;
  backupSettings?: unknown;
}

export const api = {
  listEntries(query: EntryQuery = {}) {
    return request<{ entries: EntrySummary[] }>(`/api/entries${buildQuery(query)}`);
  },
  getEntriesByDate(dateKey: string) {
    return request<{ entries: EntrySummary[] }>(`/api/entries/by-date/${dateKey}`);
  },
  getEntry(id: string) {
    return request<{ entry: EntryDetail }>(`/api/entries/${id}`);
  },
  createEntry(payload: EntryFormPayload) {
    return request<{ entry: EntryDetail }>("/api/entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateEntry(id: string, payload: EntryFormPayload) {
    return request<{ entry: EntryDetail }>(`/api/entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteEntry(id: string) {
    return request<{ ok: true }>(`/api/entries/${id}`, { method: "DELETE" });
  },
  duplicateEntry(id: string, targetDate: string) {
    return request<{ entry: EntryDetail }>(`/api/entries/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ targetDate }),
    });
  },
  listTags() {
    return request<{ tags: TagDTO[] }>("/api/tags");
  },
  createTag(name: string, color?: string) {
    return request<{ tag: TagDTO }>("/api/tags", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  },
  updateTag(id: string, payload: { name?: string; color?: string }) {
    return request<{ tag: TagDTO }>(`/api/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteTag(id: string) {
    return request<{ ok: true }>(`/api/tags/${id}`, { method: "DELETE" });
  },
  getSettings() {
    return request<{ settings: AppearanceSettings; updatedAt: string | null }>("/api/settings");
  },
  saveSettings(settings: AppearanceSettings) {
    return request<{ ok: true; updatedAt: string }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });
  },
  getStats() {
    return request<{ stats: FullStats }>("/api/stats");
  },
  getMemories(dateKey: string, includeRecent = false) {
    return request<MemoriesPayload>(`/api/memories${buildQuery({ date: dateKey, recent: includeRecent ? "true" : undefined })}`);
  },
  async uploadImage(file: File, purpose: "entry" | "background" = "entry") {
    const formData = new FormData();
    formData.set("file", await optimizeImageForUpload(file));
    formData.set("purpose", purpose);
    return request<{ image: EntryDetail["images"][number] }>("/api/uploads", {
      method: "POST",
      body: formData,
    });
  },
  deleteImage(id: string) {
    return request<{ ok: true }>(`/api/images/${id}`, { method: "DELETE" });
  },
  inspectImport(data: unknown, strategy: "skip" | "overwrite", applySettings: boolean) {
    return request<ImportPreview>("/api/import", {
      method: "POST",
      body: JSON.stringify({ data, strategy, applySettings, dryRun: true }),
    });
  },
  runImport(data: unknown, strategy: "skip" | "overwrite", applySettings: boolean) {
    return request<ImportPreview>("/api/import", {
      method: "POST",
      body: JSON.stringify({ data, strategy, applySettings, dryRun: false }),
    });
  },
};
