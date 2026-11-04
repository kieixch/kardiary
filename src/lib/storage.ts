import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp, { type Metadata } from "sharp";
import { HttpError } from "@/lib/http";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ROOT = process.env.KARDIARY_UPLOAD_DIR
  ? path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.KARDIARY_UPLOAD_DIR)
  : path.join(process.cwd(), "data", "uploads");

const FORMAT_INFO: Record<string, { mime: string; ext: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
  gif: { mime: "image/gif", ext: "gif" },
};

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

let r2Client: S3Client | null = null;

function readEnv(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  return raw.replace(/^(['"])(.*)\1$/, "$2").trim() || null;
}

function normalizeR2AccountId(value: string | null): string | null {
  if (!value) return null;
  return value.match(/[a-f0-9]{32}/i)?.[0] ?? null;
}

function getR2Config(): R2Config | null {
  const accountId = normalizeR2AccountId(readEnv("R2_ACCOUNT_ID"));
  const endpointOverride = readEnv("R2_ENDPOINT");
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");
  const bucket = readEnv("R2_BUCKET");
  const endpoint =
    endpointOverride ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

export function isObjectStorageEnabled(): boolean {
  return getR2Config() !== null;
}

function assertStorageReady(): void {
  if (isObjectStorageEnabled()) return;
  if (process.env.VERCEL) {
    throw new HttpError(
      503,
      "Cloudflare R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
      "STORAGE_NOT_CONFIGURED",
    );
  }
}

function getR2Client(config: R2Config): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return r2Client;
}

export interface StoredImage {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
}

function detectMagic(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") return "gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export function isInsideUploadRoot(target: string): boolean {
  const resolvedRoot = path.resolve(UPLOAD_ROOT);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

export function resolveStoragePath(storagePath: string): string {
  if (!storagePath || storagePath.includes("\0")) {
    throw new Error("Invalid storage path");
  }
  const resolved = path.resolve(UPLOAD_ROOT, storagePath);
  if (!isInsideUploadRoot(resolved)) {
    throw new Error("Storage path escapes upload directory");
  }
  return resolved;
}

export interface ImageInspection {
  format: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

export async function inspectImageBuffer(buffer: Buffer): Promise<ImageInspection> {
  if (buffer.length === 0) throw new Error("File is empty");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error("File is too large");

  const magicFormat = detectMagic(buffer);
  if (!magicFormat || !FORMAT_INFO[magicFormat]) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WEBP, or GIF.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new Error("The file is not a valid image");
  }

  const format = metadata.format ?? magicFormat;
  const info = FORMAT_INFO[format];
  if (!info || !FORMAT_INFO[magicFormat]) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WEBP, or GIF.");
  }

  return {
    format,
    mimeType: info.mime,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}

function storageKey(extension: string): string {
  const now = new Date();
  const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return path.posix.join(folder, `${randomUUID()}${extension}`);
}

export async function saveImageBuffer(buffer: Buffer, originalFilename: string): Promise<StoredImage> {
  assertStorageReady();
  const inspection = await inspectImageBuffer(buffer);
  const info = FORMAT_INFO[inspection.format];
  if (!info) throw new Error("Unsupported image type. Use JPEG, PNG, WEBP, or GIF.");
  const relativePath = storageKey(`.${info.ext}`);

  const config = getR2Config();
  if (config) {
    try {
      await getR2Client(config).send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: relativePath,
          Body: buffer,
          ContentType: info.mime,
          CacheControl: "private, max-age=31536000, immutable",
        }),
      );
    } catch (error) {
      console.error("[kardiary] R2 upload failed", error);
      throw new HttpError(
        502,
        "Cloudflare R2 upload failed. Check the R2 credentials, bucket name, and permissions.",
        "R2_UPLOAD_FAILED",
      );
    }
  } else {
    const absolutePath = resolveStoragePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer, { flag: "wx", mode: 0o600 });
  }

  return {
    storagePath: relativePath,
    originalFilename: sanitizeOriginalFilename(originalFilename, info.ext),
    mimeType: info.mime,
    fileSize: buffer.length,
    width: inspection.width,
    height: inspection.height,
  };
}

function sanitizeOriginalFilename(name: string, ext: string): string {
  const base = path
    .basename(name || `image.${ext}`)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .trim();
  if (!base) return `image.${ext}`;
  return base.slice(0, 180);
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  assertStorageReady();
  const config = getR2Config();
  if (!config) return readFile(resolveStoragePath(storagePath));

  const response = await getR2Client(config).send(
    new GetObjectCommand({ Bucket: config.bucket, Key: storagePath }),
  );
  if (!response.Body) throw new Error("Stored file is empty");
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  assertStorageReady();
  const config = getR2Config();
  if (!config) {
    try {
      await unlink(resolveStoragePath(storagePath));
    } catch {
      // Missing files are harmless; metadata cleanup still proceeds.
    }
    return;
  }

  try {
    await getR2Client(config).send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: storagePath }),
    );
  } catch {
    // Missing objects are harmless; metadata cleanup still proceeds.
  }
}

export async function copyStoredFile(storagePath: string): Promise<string> {
  assertStorageReady();
  const parsed = path.posix.parse(storagePath);
  const relativePath = storageKey(parsed.ext || "");
  const config = getR2Config();

  if (config) {
    await getR2Client(config).send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        Key: relativePath,
        CopySource: `${config.bucket}/${storagePath}`,
      }),
    );
  } else {
    const absolutePath = resolveStoragePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await copyFile(resolveStoragePath(storagePath), absolutePath);
  }

  return relativePath;
}

export async function saveBase64Image(
  dataBase64: string,
  originalFilename: string,
  declaredMime?: string,
): Promise<StoredImage> {
  const base64 = dataBase64.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) throw new Error("Imported image is empty");
  const stored = await saveImageBuffer(buffer, originalFilename);
  if (declaredMime && declaredMime !== stored.mimeType) {
    // Re-encoded/renamed mismatch is not fatal; the actual bytes are authoritative.
  }
  return stored;
}
