import { NextResponse, connection } from "next/server";
import { deleteEntry, getEntryById, updateEntry } from "@/lib/entries";
import { errorResponse, readJson } from "@/lib/http";
import { entryUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  await connection();
  try {
    const { id } = await params;
    const entry = await getEntryById(id);
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = entryUpdateSchema.parse(body);
    const entry = await updateEntry(id, input);
    return NextResponse.json({ entry });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await deleteEntry(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
