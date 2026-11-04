import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { imageDto, entryInclude } from "@/lib/serialize";
import { MAX_UPLOAD_BYTES, saveImageBuffer, deleteStoredFile } from "@/lib/storage";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function cleanupOrphans() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orphans = await prisma.diaryImage.findMany({
    where: { entryId: null, purpose: "entry", createdAt: { lt: cutoff } },
  });
  if (orphans.length === 0) return;
  await prisma.diaryImage.deleteMany({ where: { id: { in: orphans.map((image) => image.id) } } });
  for (const image of orphans) await deleteStoredFile(image.storagePath);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const purposeValue = String(formData.get("purpose") ?? "entry");
    const purpose = purposeValue === "background" ? "background" : "entry";

    if (!(file instanceof File)) throw new HttpError(400, "No file uploaded", "NO_FILE");
    if (file.size === 0) throw new HttpError(400, "File is empty", "EMPTY_FILE");
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new HttpError(413, "File is too large. Maximum size is 10 MB.", "FILE_TOO_LARGE");
    }
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      throw new HttpError(415, "Unsupported image type. Use JPEG, PNG, WEBP, or GIF.", "UNSUPPORTED_TYPE");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveImageBuffer(buffer, file.name);

    const image = await prisma.diaryImage.create({
      data: {
        entryId: null,
        purpose,
        storagePath: stored.storagePath,
        originalFilename: stored.originalFilename,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        width: stored.width,
        height: stored.height,
      },
    });

    if (purpose === "entry") {
      cleanupOrphans().catch((error) => console.error("[kardiary] Orphan cleanup failed", error));
    }

    return NextResponse.json({ image: imageDto(image) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  await connection();
  try {
    const url = new URL(request.url);
    const entryId = url.searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ images: [] });
    const entry = await prisma.diaryEntry.findUnique({ where: { id: entryId }, include: entryInclude });
    return NextResponse.json({ images: entry ? entry.images.map(imageDto) : [] });
  } catch (error) {
    return errorResponse(error);
  }
}
