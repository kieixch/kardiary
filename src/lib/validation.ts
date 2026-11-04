import { z } from "zod";
import { isValidDateKey } from "@/lib/date";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color");
const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
  .refine(isValidDateKey, "Invalid calendar date");
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:MM");

export const colorPaletteSchema = z.object({
  background: hexColor,
  surface: hexColor,
  card: hexColor,
  text: hexColor,
  muted: hexColor,
  primary: hexColor,
  primaryText: hexColor,
  accent: hexColor,
  border: hexColor,
  selected: hexColor,
  selectedText: hexColor,
  today: hexColor,
  danger: hexColor,
});

export const moodSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
  labelEn: z.string().min(1).max(40),
  emoji: z.string().min(1).max(8),
  color: hexColor,
  enabled: z.boolean(),
});

export const appearanceSchema = z.object({
  version: z.literal(1),
  presetId: z.string().min(1).max(60),
  mode: z.enum(["light", "dark", "system"]),
  palettes: z.object({ light: colorPaletteSchema, dark: colorPaletteSchema }),
  background: z.object({
    type: z.enum(["solid", "gradient", "image"]),
    gradientFrom: hexColor,
    gradientTo: hexColor,
    imageUrl: z.string().max(2048),
    overlayOpacity: z.number().min(0).max(1),
  }),
  typography: z.object({
    fontFamily: z.enum(["editorial", "modern", "classic-serif", "soft-rounded", "humanist", "mono"]),
    baseSize: z.number().min(13).max(22),
    headingScale: z.number().min(0.8).max(1.5),
    lineHeight: z.number().min(1.2).max(2.2),
    letterSpacing: z.number().min(-0.5).max(2),
  }),
  layout: z.object({
    nav: z.enum(["sidebar", "top"]),
    density: z.enum(["compact", "spacious"]),
    pageWidth: z.number().min(760).max(1800),
    align: z.enum(["left", "center"]),
    radius: z.number().min(0).max(40),
    shadow: z.enum(["none", "soft", "medium", "strong"]),
    cellSize: z.number().min(60).max(160),
    cellGap: z.number().min(0).max(24),
  }),
  calendar: z.object({
    firstDayOfWeek: z.union([z.literal(0), z.literal(1)]),
    showMood: z.boolean(),
    showThumbnails: z.boolean(),
    entryIndicator: z.enum(["dot", "underline", "badge", "glow"]),
    gridStyle: z.enum(["minimal", "cards", "scrapbook", "polaroid", "pastel", "journal"]),
  }),
  imageStyle: z.enum(["rounded", "polaroid", "sharp", "soft"]),
  locale: z.enum(["id", "en"]),
  moods: z.array(moodSchema).min(1).max(30),
});

export const settingsPutSchema = z.object({
  settings: appearanceSchema,
});

const imageRefSchema = z.object({
  id: z.string().min(1).max(60),
  caption: z.string().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(200),
});

export const entryCreateSchema = z.object({
  dateKey: dateKeySchema,
  time: timeSchema.optional(),
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(2_000_000).optional(),
  mood: z.string().max(40).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  weather: z.string().max(120).nullable().optional(),
  highlights: z.string().max(3000).nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  images: z.array(imageRefSchema).max(30).optional(),
});

export const entryUpdateSchema = z
  .object({
    time: timeSchema.optional(),
    title: z.string().max(200).nullable().optional(),
    content: z.string().max(2_000_000).optional(),
    mood: z.string().max(40).nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    weather: z.string().max(120).nullable().optional(),
    highlights: z.string().max(3000).nullable().optional(),
    status: z.enum(["draft", "published"]).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    images: z.array(imageRefSchema).max(30).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No fields to update");

export const duplicateSchema = z.object({
  targetDate: dateKeySchema,
});

export const tagCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: hexColor.optional(),
});

export const tagUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    color: hexColor.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No fields to update");

export const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
  mood: z.string().max(40).optional(),
  tag: z.string().max(40).optional(),
  hasImages: z.enum(["true", "false"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
  sort: z.enum(["newest", "oldest", "updated"]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const backupImageSchema = z.object({
  id: z.string().optional(),
  caption: z.string().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(200).optional(),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  dataBase64: z.string().max(20 * 1024 * 1024).optional(),
});

const backupEntrySchema = z.object({
  dateKey: dateKeySchema,
  time: timeSchema.optional(),
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(2_000_000).optional(),
  contentText: z.string().max(2_000_000).optional(),
  mood: z.string().max(40).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  weather: z.string().max(120).nullable().optional(),
  highlights: z.string().max(3000).nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.union([z.string().min(1).max(40), z.object({ name: z.string().min(1).max(40), color: hexColor.optional() })])).max(20).optional(),
  images: z.array(backupImageSchema).max(30).optional(),
});

export const backupSchema = z.object({
  app: z.literal("kardiary"),
  version: z.number().int().min(1).max(10),
  exportedAt: z.string().optional(),
  entries: z.array(backupEntrySchema).max(20000),
  tags: z.array(z.object({ name: z.string().min(1).max(40), color: hexColor.optional() })).max(200).optional(),
  settings: z.unknown().optional(),
});

export const importRequestSchema = z.object({
  data: backupSchema,
  strategy: z.enum(["skip", "overwrite"]).optional(),
  dryRun: z.boolean().optional(),
  applySettings: z.boolean().optional(),
});

export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export type EntryUpdateInput = z.infer<typeof entryUpdateSchema>;
export type BackupInput = z.infer<typeof backupSchema>;
