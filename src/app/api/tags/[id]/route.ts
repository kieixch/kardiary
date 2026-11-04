import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { tagDto } from "@/lib/serialize";
import { tagUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = tagUpdateSchema.parse(body);
    if (input.name) {
      const existing = await prisma.tag.findFirst({
        where: { name: input.name.trim(), NOT: { id } },
      });
      if (existing) throw new HttpError(409, "A tag with this name already exists", "TAG_EXISTS");
    }
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.color ? { color: input.color } : {}),
      },
    });
    return NextResponse.json({ tag: tagDto(tag) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
