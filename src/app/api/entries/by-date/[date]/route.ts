import { NextResponse, connection } from "next/server";
import { getEntriesByDate } from "@/lib/entries";
import { isValidDateKey } from "@/lib/date";
import { errorResponse } from "@/lib/http";

type Context = { params: Promise<{ date: string }> };

export async function GET(_request: Request, { params }: Context) {
  await connection();
  try {
    const { date } = await params;
    if (!isValidDateKey(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const entries = await getEntriesByDate(date);
    return NextResponse.json({ entries, entry: entries[0] ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
