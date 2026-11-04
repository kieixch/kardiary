import { NextResponse } from "next/server";
import { duplicateEntry } from "@/lib/entries";
import { errorResponse, readJson } from "@/lib/http";
import { duplicateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const { targetDate } = duplicateSchema.parse(body);
    const entry = await duplicateEntry(id, targetDate);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
