import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, normalizeSettings, type AppearanceSettings } from "@/lib/appearance";

export const SETTINGS_ID = "default";

export async function getSettings(): Promise<{ settings: AppearanceSettings; updatedAt: string | null }> {
  const record = await prisma.diarySettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!record) {
    return { settings: normalizeSettings(DEFAULT_SETTINGS), updatedAt: null };
  }
  try {
    const parsed = JSON.parse(record.data) as unknown;
    return { settings: normalizeSettings(parsed), updatedAt: record.updatedAt.toISOString() };
  } catch {
    return { settings: normalizeSettings(DEFAULT_SETTINGS), updatedAt: record.updatedAt.toISOString() };
  }
}

export async function saveSettings(settings: AppearanceSettings): Promise<{ updatedAt: string }> {
  const normalized = normalizeSettings(settings);
  const record = await prisma.diarySettings.upsert({
    where: { id: SETTINGS_ID },
    update: { data: JSON.stringify(normalized), locale: normalized.locale },
    create: { id: SETTINGS_ID, data: JSON.stringify(normalized), locale: normalized.locale },
  });
  return { updatedAt: record.updatedAt.toISOString() };
}
