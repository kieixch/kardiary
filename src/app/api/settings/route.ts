import { NextResponse } from "next/server";
import { connection } from "next/server";
import { errorResponse, readJson } from "@/lib/http";
import { getSettings, saveSettings } from "@/lib/settings-store";
import { settingsPutSchema } from "@/lib/validation";

export async function GET() {
  await connection();
  try {
    const result = await getSettings();
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJson(request);
    const { settings } = settingsPutSchema.parse(body);
    const result = await saveSettings(settings);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
