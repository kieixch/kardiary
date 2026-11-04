import { NextResponse } from "next/server";
import { connection } from "next/server";
import { errorResponse } from "@/lib/http";
import { computeStats } from "@/lib/stats";

export async function GET() {
  await connection();
  try {
    const stats = await computeStats();
    return NextResponse.json({ stats });
  } catch (error) {
    return errorResponse(error);
  }
}
