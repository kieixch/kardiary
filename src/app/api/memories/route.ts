import { NextResponse, connection } from "next/server";
import { todayKey, isValidDateKey } from "@/lib/date";
import { errorResponse } from "@/lib/http";
import { getMemories, getRecentMemories } from "@/lib/memories";

export async function GET(request: Request) {
  await connection();
  try {
    const url = new URL(request.url);
    const dateKey = url.searchParams.get("date") ?? todayKey();
    if (!isValidDateKey(dateKey)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const entries = await getMemories(dateKey);
    const recent = url.searchParams.get("recent") === "true" ? await getRecentMemories(3) : [];
    return NextResponse.json({ date: dateKey, entries, recent });
  } catch (error) {
    return errorResponse(error);
  }
}
