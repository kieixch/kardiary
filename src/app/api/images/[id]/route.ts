import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { readStoredFile, deleteStoredFile } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  await connection();
  try {
    const { id } = await params;
    const image = await prisma.diaryImage.findUnique({ where: { id } });
    if (!image) return new NextResponse("Not found", { status: 404 });

    const buffer = await readStoredFile(image.storagePath);
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const filename = image.originalFilename.replace(/["\r\n]/g, "-");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const image = await prisma.diaryImage.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ ok: true });
    if (image.purpose === "background") {
      return NextResponse.json({ error: "Background images are removed through appearance settings" }, { status: 400 });
    }
    await prisma.diaryImage.delete({ where: { id } });
    await deleteStoredFile(image.storagePath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
