import { NextResponse, connection } from "next/server";
import { createEntry, listEntries } from "@/lib/entries";
import { errorResponse, readJson } from "@/lib/http";
import { entryCreateSchema, listQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  await connection();
  try {
    const url = new URL(request.url);
    const parsed = listQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const entries = await listEntries(parsed);
    return NextResponse.json({ entries });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = entryCreateSchema.parse(body);
    const entry = await createEntry(input);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
