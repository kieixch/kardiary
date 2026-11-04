import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse, readJson } from "@/lib/http";
import { tagDto } from "@/lib/serialize";
import { colorForName } from "@/lib/tag-colors";
import { tagCreateSchema } from "@/lib/validation";
import { HttpError } from "@/lib/http";

export async function GET() {
  await connection();
  try {
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { entries: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      tags: tags.map((tag) => tagDto({ id: tag.id, name: tag.name, color: tag.color, count: tag._count.entries })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = tagCreateSchema.parse(body);
    const name = input.name.trim();
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) throw new HttpError(409, "Tag already exists", "TAG_EXISTS");
    const tag = await prisma.tag.create({
      data: { name, color: input.color ?? colorForName(name) },
    });
    return NextResponse.json({ tag: tagDto(tag) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
