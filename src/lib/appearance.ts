import { DEFAULT_MOODS, type MoodOption } from "@/lib/moods";

export type ThemeMode = "light" | "dark" | "system";
export type Locale = "id" | "en";
export type FontFamily = "editorial" | "modern" | "classic-serif" | "soft-rounded" | "humanist" | "mono";
export type GridStyle = "minimal" | "cards" | "scrapbook" | "polaroid" | "pastel" | "journal";
export type EntryIndicator = "dot" | "underline" | "badge" | "glow";
export type ImageStyle = "rounded" | "polaroid" | "sharp" | "soft";

export interface ColorPalette {
  background: string;
  surface: string;
  card: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  accent: string;
  border: string;
  selected: string;
  selectedText: string;
  today: string;
  danger: string;
}

export interface BackgroundSettings {
  type: "solid" | "gradient" | "image";
  gradientFrom: string;
  gradientTo: string;
  imageUrl: string;
  overlayOpacity: number;
}

export interface TypographySettings {
  fontFamily: FontFamily;
  baseSize: number;
  headingScale: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface LayoutSettings {
  nav: "sidebar" | "top";
  density: "compact" | "spacious";
  pageWidth: number;
  align: "left" | "center";
  radius: number;
  shadow: "none" | "soft" | "medium" | "strong";
  cellSize: number;
  cellGap: number;
}

export interface CalendarSettings {
  firstDayOfWeek: 0 | 1;
  showMood: boolean;
  showThumbnails: boolean;
  entryIndicator: EntryIndicator;
  gridStyle: GridStyle;
}

export interface AppearanceSettings {
  version: 1;
  presetId: string;
  mode: ThemeMode;
  palettes: {
    light: ColorPalette;
    dark: ColorPalette;
  };
  background: BackgroundSettings;
  typography: TypographySettings;
  layout: LayoutSettings;
  calendar: CalendarSettings;
  imageStyle: ImageStyle;
  locale: Locale;
  moods: MoodOption[];
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const lightCozy: ColorPalette = {
  background: "#F4EFE6",
  surface: "#FBF8F1",
  card: "#FFFDF8",
  text: "#2E2A24",
  muted: "#7C7468",
  primary: "#7F9270",
  primaryText: "#FFFFFF",
  accent: "#C9A227",
  border: "#E3DACB",
  selected: "#DCE5D3",
  selectedText: "#33402B",
  today: "#B96F4C",
  danger: "#B4443C",
};

const darkCozy: ColorPalette = {
  background: "#1E1C19",
  surface: "#26231F",
  card: "#2E2A25",
  text: "#F1EADF",
  muted: "#B3A997",
  primary: "#9DB38A",
  primaryText: "#1B2416",
  accent: "#D8B85A",
  border: "#413A32",
  selected: "#3B4A34",
  selectedText: "#EAF2E2",
  today: "#E0956F",
  danger: "#E07A70",
};

function palette(base: ColorPalette, overrides: Partial<ColorPalette>): ColorPalette {
  return { ...base, ...overrides };
}

export const DEFAULT_SETTINGS: AppearanceSettings = {
  version: 1,
  presetId: "cozy-vintage",
  mode: "light",
  palettes: {
    light: lightCozy,
    dark: darkCozy,
  },
  background: {
    type: "solid",
    gradientFrom: "#F4EFE6",
    gradientTo: "#E7E0D2",
    imageUrl: "",
    overlayOpacity: 0.55,
  },
  typography: {
    fontFamily: "editorial",
    baseSize: 16,
    headingScale: 1,
    lineHeight: 1.7,
    letterSpacing: 0,
  },
  layout: {
    nav: "sidebar",
    density: "spacious",
    pageWidth: 1240,
    align: "center",
    radius: 18,
    shadow: "soft",
    cellSize: 92,
    cellGap: 8,
  },
  calendar: {
    firstDayOfWeek: 1,
    showMood: true,
    showThumbnails: false,
    entryIndicator: "dot",
    gridStyle: "cards",
  },
  imageStyle: "rounded",
  locale: "id",
  moods: DEFAULT_MOODS,
};

export interface AppearancePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  swatches: string[];
  overrides: DeepPartial<AppearanceSettings>;
}

const scrapbookLight = palette(lightCozy, {
  background: "#F7EFE4",
  surface: "#FFF9EF",
  card: "#FFFDF7",
  text: "#3B322A",
  muted: "#85766A",
  primary: "#C4704F",
  primaryText: "#FFFFFF",
  accent: "#D9A441",
  border: "#E5D5C2",
  selected: "#F3D9C9",
  selectedText: "#6B3A28",
  today: "#B7533B",
});

const scrapbookDark = palette(darkCozy, {
  background: "#211C18",
  surface: "#2B241F",
  card: "#332B24",
  text: "#F6EDE1",
  muted: "#C2B09E",
  primary: "#E0916D",
  primaryText: "#2A160E",
  accent: "#EAC16A",
  border: "#4A3D33",
  selected: "#5A3A2C",
  selectedText: "#FFE9DC",
  today: "#F0A37F",
});

const minimalLight = palette(lightCozy, {
  background: "#FAFAF8",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1D1D1B",
  muted: "#76766F",
  primary: "#34342F",
  primaryText: "#FFFFFF",
  accent: "#8A8A7F",
  border: "#E5E5DF",
  selected: "#ECECE5",
  selectedText: "#22221E",
  today: "#A65A3A",
});

const minimalDark = palette(darkCozy, {
  background: "#121211",
  surface: "#1A1A18",
  card: "#20201D",
  text: "#F2F2EC",
  muted: "#A0A097",
  primary: "#E8E8DF",
  primaryText: "#1A1A17",
  accent: "#B9B9AC",
  border: "#33332E",
  selected: "#2D2D28",
  selectedText: "#F7F7F0",
  today: "#E38B63",
});

const calmLight = palette(lightCozy, {
  background: "#F2F0E9",
  surface: "#FAF8F2",
  card: "#FFFDF8",
  text: "#2C2F33",
  muted: "#777B7F",
  primary: "#5E6C84",
  primaryText: "#FFFFFF",
  accent: "#A3846A",
  border: "#DCD9CF",
  selected: "#DDE2E9",
  selectedText: "#2E3A4A",
  today: "#A35F4B",
});

const calmDark = palette(darkCozy, {
  background: "#191B1E",
  surface: "#212429",
  card: "#282C32",
  text: "#ECEEF1",
  muted: "#A6ADB6",
  primary: "#8FA3C2",
  primaryText: "#151B25",
  accent: "#C3A68A",
  border: "#353A42",
  selected: "#2E4058",
  selectedText: "#E6EEF8",
  today: "#E0A083",
});

const y2kLight = palette(lightCozy, {
  background: "#F5ECFA",
  surface: "#FDF8FF",
  card: "#FFFFFF",
  text: "#332A3D",
  muted: "#84778F",
  primary: "#C05AB4",
  primaryText: "#FFFFFF",
  accent: "#7C6BE8",
  border: "#E8D8F2",
  selected: "#F4D6F1",
  selectedText: "#6B2364",
  today: "#E07BB7",
});

const y2kDark = palette(darkCozy, {
  background: "#1D1723",
  surface: "#271F2E",
  card: "#302638",
  text: "#F5ECFA",
  muted: "#BCAAC8",
  primary: "#E58FD9",
  primaryText: "#2A1027",
  accent: "#A79AF5",
  border: "#43354D",
  selected: "#53355F",
  selectedText: "#FFEAFB",
  today: "#F3A6D4",
});

const cinematicLight = palette(lightCozy, {
  background: "#F2EEE6",
  surface: "#F9F6F0",
  card: "#FFFDF9",
  text: "#28241F",
  muted: "#7F776C",
  primary: "#8A6A3B",
  primaryText: "#FFFFFF",
  accent: "#B78B4B",
  border: "#DED6C8",
  selected: "#E9DFCC",
  selectedText: "#40331F",
  today: "#A25B3C",
});

const cinematicDark = palette(darkCozy, {
  background: "#11100E",
  surface: "#191713",
  card: "#201D18",
  text: "#F4ECDD",
  muted: "#B5A88F",
  primary: "#D3A65C",
  primaryText: "#241A08",
  accent: "#9A7A44",
  border: "#3A3328",
  selected: "#4A3A20",
  selectedText: "#FFF2D9",
  today: "#E3B36B",
});

const botanicalLight = palette(lightCozy, {
  background: "#EEF2E8",
  surface: "#F7F9F2",
  card: "#FFFFFF",
  text: "#28322A",
  muted: "#6E7B6E",
  primary: "#4F7A54",
  primaryText: "#FFFFFF",
  accent: "#8FA76B",
  border: "#D5DECB",
  selected: "#D9E7D2",
  selectedText: "#294229",
  today: "#A96C4D",
});

const botanicalDark = palette(darkCozy, {
  background: "#171D17",
  surface: "#1E261E",
  card: "#253026",
  text: "#ECF2E7",
  muted: "#A9B8A4",
  primary: "#8DB98C",
  primaryText: "#152415",
  accent: "#B1C883",
  border: "#334234",
  selected: "#344A35",
  selectedText: "#E9F5E5",
  today: "#E0A17B",
});

export const PRESETS: AppearancePreset[] = [
  {
    id: "cozy-vintage",
    name: "Jurnal Vintase Hangat",
    nameEn: "Cozy Vintage Journal",
    description: "Ivory hangat, sage lembut, dan serif klasik.",
    descriptionEn: "Warm ivory, muted sage, and classic serifs.",
    swatches: ["#F4EFE6", "#7F9270", "#C9A227", "#2E2A24"],
    overrides: {
      presetId: "cozy-vintage",
      mode: "light",
      palettes: { light: lightCozy, dark: darkCozy },
      typography: { fontFamily: "editorial", baseSize: 16, headingScale: 1, lineHeight: 1.7, letterSpacing: 0 },
      layout: { nav: "sidebar", density: "spacious", pageWidth: 1240, align: "center", radius: 18, shadow: "soft", cellSize: 92, cellGap: 8 },
      calendar: { firstDayOfWeek: 1, showMood: true, showThumbnails: false, entryIndicator: "dot", gridStyle: "cards" },
      background: { type: "solid", gradientFrom: "#F4EFE6", gradientTo: "#E7E0D2", imageUrl: "", overlayOpacity: 0.55 },
      imageStyle: "rounded",
    },
  },
  {
    id: "digital-scrapbook",
    name: "Scrapbook Digital",
    nameEn: "Digital Scrapbook",
    description: "Potongan kertas, warna terakota, dan foto polaroid.",
    descriptionEn: "Paper cut-outs, terracotta tones, and polaroid photos.",
    swatches: ["#F7EFE4", "#C4704F", "#D9A441", "#3B322A"],
    overrides: {
      presetId: "digital-scrapbook",
      mode: "light",
      palettes: { light: scrapbookLight, dark: scrapbookDark },
      typography: { fontFamily: "soft-rounded", baseSize: 16, headingScale: 1.05, lineHeight: 1.65, letterSpacing: 0.1 },
      layout: { nav: "sidebar", density: "spacious", pageWidth: 1280, align: "center", radius: 24, shadow: "medium", cellSize: 104, cellGap: 10 },
      calendar: { firstDayOfWeek: 1, showMood: true, showThumbnails: true, entryIndicator: "badge", gridStyle: "scrapbook" },
      background: { type: "gradient", gradientFrom: "#F7EFE4", gradientTo: "#EFE1D1", imageUrl: "", overlayOpacity: 0.5 },
      imageStyle: "polaroid",
    },
  },
  {
    id: "minimal-editorial",
    name: "Editorial Minimal",
    nameEn: "Minimal Editorial",
    description: "Ruang putih, tipografi tegas, dan garis tipis.",
    descriptionEn: "White space, crisp type, and fine lines.",
    swatches: ["#FAFAF8", "#34342F", "#8A8A7F", "#1D1D1B"],
    overrides: {
      presetId: "minimal-editorial",
      mode: "light",
      palettes: { light: minimalLight, dark: minimalDark },
      typography: { fontFamily: "modern", baseSize: 15, headingScale: 1.15, lineHeight: 1.6, letterSpacing: 0 },
      layout: { nav: "top", density: "compact", pageWidth: 1120, align: "center", radius: 8, shadow: "none", cellSize: 84, cellGap: 4 },
      calendar: { firstDayOfWeek: 1, showMood: false, showThumbnails: false, entryIndicator: "dot", gridStyle: "minimal" },
      background: { type: "solid", gradientFrom: "#FAFAF8", gradientTo: "#EFEFEA", imageUrl: "", overlayOpacity: 0.5 },
      imageStyle: "sharp",
    },
  },
  {
    id: "japanese-calm",
    name: "Jurnal Tenang Jepang",
    nameEn: "Japanese-inspired Calm",
    description: "Kertas washi, indigo pudar, dan napas yang lapang.",
    descriptionEn: "Washi paper, faded indigo, and generous breathing room.",
    swatches: ["#F2F0E9", "#5E6C84", "#A3846A", "#2C2F33"],
    overrides: {
      presetId: "japanese-calm",
      mode: "light",
      palettes: { light: calmLight, dark: calmDark },
      typography: { fontFamily: "classic-serif", baseSize: 16, headingScale: 0.95, lineHeight: 1.85, letterSpacing: 0.2 },
      layout: { nav: "sidebar", density: "spacious", pageWidth: 1180, align: "center", radius: 12, shadow: "soft", cellSize: 96, cellGap: 6 },
      calendar: { firstDayOfWeek: 1, showMood: true, showThumbnails: false, entryIndicator: "underline", gridStyle: "cards" },
      background: { type: "solid", gradientFrom: "#F2F0E9", gradientTo: "#E8E4D8", imageUrl: "", overlayOpacity: 0.55 },
      imageStyle: "soft",
    },
  },
  {
    id: "y2k-diary",
    name: "Diari Digital Y2K",
    nameEn: "Y2K Digital Diary",
    description: "Ungu manis, kilau pastel, dan energi awal 2000-an.",
    descriptionEn: "Sweet lilac, pastel glow, and early-2000s energy.",
    swatches: ["#F5ECFA", "#C05AB4", "#7C6BE8", "#332A3D"],
    overrides: {
      presetId: "y2k-diary",
      mode: "light",
      palettes: { light: y2kLight, dark: y2kDark },
      typography: { fontFamily: "modern", baseSize: 16, headingScale: 1.1, lineHeight: 1.65, letterSpacing: 0.1 },
      layout: { nav: "sidebar", density: "compact", pageWidth: 1260, align: "center", radius: 24, shadow: "medium", cellSize: 96, cellGap: 10 },
      calendar: { firstDayOfWeek: 1, showMood: true, showThumbnails: true, entryIndicator: "glow", gridStyle: "pastel" },
      background: { type: "gradient", gradientFrom: "#F5ECFA", gradientTo: "#EAF0FF", imageUrl: "", overlayOpacity: 0.45 },
      imageStyle: "rounded",
    },
  },
  {
    id: "dark-cinematic",
    name: "Diari Sinematik Gelap",
    nameEn: "Dark Cinematic Diary",
    description: "Layar gelap, emas redup, dan suasana teater.",
    descriptionEn: "Dark screens, dimmed gold, and cinematic mood.",
    swatches: ["#11100E", "#D3A65C", "#3A3328", "#F4ECDD"],
    overrides: {
      presetId: "dark-cinematic",
      mode: "dark",
      palettes: { light: cinematicLight, dark: cinematicDark },
      typography: { fontFamily: "editorial", baseSize: 16, headingScale: 1.08, lineHeight: 1.75, letterSpacing: 0.1 },
      layout: { nav: "sidebar", density: "spacious", pageWidth: 1200, align: "center", radius: 12, shadow: "strong", cellSize: 92, cellGap: 8 },
      calendar: { firstDayOfWeek: 1, showMood: true, showThumbnails: true, entryIndicator: "glow", gridStyle: "journal" },
      background: { type: "gradient", gradientFrom: "#11100E", gradientTo: "#1C1812", imageUrl: "", overlayOpacity: 0.6 },
      imageStyle: "rounded",
    },
  },
  {
    id: "botanical",
    name: "Jurnal Botani Lembut",
    nameEn: "Soft Green Botanical",
    description: "Hijau daun, kertas lembut, dan ketenangan alam.",
    descriptionEn: "Leafy green, soft paper, and natural calm.",
    swatches: ["#EEF2E8", "#4F7A54", "#8FA76B", "#28322A"],
    overrides: {
      presetId: "botanical",
      mode: "light",
      palettes: { light: botanicalLight, dark: botanicalDark },
      typography: { fontFamily: "humanist", baseSize: 16, headingScale: 1, lineHeight: 1.75, letterSpacing: 0 },
      layout: { nav: "sidebar", density: "spacious", pageWidth: 1240, align: "center", radius: 20, shadow: "soft", cellSize: 94, cellGap: 8 },
      calendar: { firstDayOfWeek: 1, showMood: true, showThumbnails: true, entryIndicator: "underline", gridStyle: "cards" },
      background: { type: "solid", gradientFrom: "#EEF2E8", gradientTo: "#DFE8D8", imageUrl: "", overlayOpacity: 0.55 },
      imageStyle: "soft",
    },
  },
];

export interface CalendarStylePreset {
  id: string;
  name: string;
  nameEn: string;
  overrides: DeepPartial<AppearanceSettings>;
}

export const CALENDAR_STYLES: CalendarStylePreset[] = [
  {
    id: "minimal",
    name: "Minimal",
    nameEn: "Minimal",
    overrides: {
      calendar: { gridStyle: "minimal", entryIndicator: "dot", showThumbnails: false },
      layout: { cellSize: 84, cellGap: 4, radius: 8, shadow: "none" },
    },
  },
  {
    id: "scrapbook",
    name: "Scrapbook",
    nameEn: "Scrapbook",
    overrides: {
      calendar: { gridStyle: "scrapbook", entryIndicator: "badge", showThumbnails: true },
      layout: { cellSize: 104, cellGap: 10, radius: 22, shadow: "medium" },
      imageStyle: "polaroid",
    },
  },
  {
    id: "polaroid",
    name: "Polaroid",
    nameEn: "Polaroid",
    overrides: {
      calendar: { gridStyle: "polaroid", entryIndicator: "dot", showThumbnails: true },
      layout: { cellSize: 110, cellGap: 12, radius: 14, shadow: "medium" },
      imageStyle: "polaroid",
    },
  },
  {
    id: "pastel",
    name: "Soft Pastel",
    nameEn: "Soft Pastel",
    overrides: {
      calendar: { gridStyle: "pastel", entryIndicator: "glow", showThumbnails: true },
      palettes: {
        light: palette(lightCozy, {
          background: "#FBF1F4",
          surface: "#FFF9FB",
          card: "#FFFFFF",
          primary: "#D98AA6",
          primaryText: "#FFFFFF",
          accent: "#A9B8E8",
          border: "#F0DCE4",
          selected: "#F7DDE8",
          selectedText: "#6C3448",
        }),
      },
      layout: { cellSize: 96, cellGap: 8, radius: 24, shadow: "soft" },
    },
  },
  {
    id: "dark-journal",
    name: "Dark Journal",
    nameEn: "Dark Journal",
    overrides: {
      mode: "dark",
      calendar: { gridStyle: "journal", entryIndicator: "underline", showThumbnails: false },
      palettes: { dark: cinematicDark },
      layout: { cellSize: 92, cellGap: 8, radius: 6, shadow: "soft" },
    },
  },
];

export const FONT_OPTIONS: { id: FontFamily; label: string; labelEn: string; body: string; heading: string }[] = [
  {
    id: "editorial",
    label: "Editorial",
    labelEn: "Editorial",
    body: '"Avenir Next", "Segoe UI", system-ui, sans-serif',
    heading: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  {
    id: "modern",
    label: "Modern Sans",
    labelEn: "Modern Sans",
    body: '"Segoe UI", system-ui, -apple-system, sans-serif',
    heading: '"Segoe UI", system-ui, -apple-system, sans-serif',
  },
  {
    id: "classic-serif",
    label: "Serif Klasik",
    labelEn: "Classic Serif",
    body: 'Georgia, "Times New Roman", serif',
    heading: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  {
    id: "soft-rounded",
    label: "Membulat Lembut",
    labelEn: "Soft Rounded",
    body: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    heading: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  },
  {
    id: "humanist",
    label: "Humanis",
    labelEn: "Humanist",
    body: 'Candara, Optima, "Segoe UI", system-ui, sans-serif',
    heading: 'Candara, Optima, "Segoe UI", system-ui, sans-serif',
  },
  {
    id: "mono",
    label: "Monospace",
    labelEn: "Monospace",
    body: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
    heading: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
  },
];

const SHADOWS: Record<LayoutSettings["shadow"], string> = {
  none: "none",
  soft: "0 1px 2px rgba(30,25,18,0.04), 0 10px 28px -20px rgba(30,25,18,0.28)",
  medium: "0 2px 4px rgba(30,25,18,0.05), 0 18px 40px -24px rgba(30,25,18,0.38)",
  strong: "0 6px 16px rgba(15,12,8,0.12), 0 30px 60px -30px rgba(15,12,8,0.55)",
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeSettings<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (!patch) return clone(base);
  if (Array.isArray(base) || Array.isArray(patch)) {
    return clone((patch ?? base) as T);
  }
  if (!isObject(base) || !isObject(patch)) {
    return clone((patch ?? base) as T);
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = result[key];
    if (isObject(current) && isObject(value)) {
      result[key] = mergeSettings(current, value as DeepPartial<typeof current>);
    } else {
      result[key] = clone(value);
    }
  }
  return result as T;
}

export function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeSettings(input: unknown): AppearanceSettings {
  if (!isObject(input)) return clone(DEFAULT_SETTINGS);
  const merged = mergeSettings(clone(DEFAULT_SETTINGS), input as DeepPartial<AppearanceSettings>);
  merged.version = 1;
  if (!Array.isArray(merged.moods) || merged.moods.length === 0) {
    merged.moods = clone(DEFAULT_MOODS);
  }
  merged.moods = merged.moods
    .filter((mood) => mood && typeof mood.id === "string" && typeof mood.emoji === "string")
    .map((mood) => ({
      id: mood.id,
      label: mood.label || mood.id,
      labelEn: mood.labelEn || mood.label || mood.id,
      emoji: mood.emoji,
      color: /^#[0-9a-fA-F]{6}$/.test(mood.color) ? mood.color : "#8A9A7B",
      enabled: mood.enabled !== false,
    }));
  if (merged.moods.length === 0) merged.moods = clone(DEFAULT_MOODS);
  return merged;
}

export function settingsFromPreset(preset: AppearancePreset, current: AppearanceSettings): AppearanceSettings {
  const merged = mergeSettings(clone(DEFAULT_SETTINGS), preset.overrides);
  merged.presetId = preset.id;
  merged.locale = current.locale;
  merged.moods = current.moods;
  return merged;
}

export function settingsFromCalendarStyle(style: CalendarStylePreset, current: AppearanceSettings): AppearanceSettings {
  const merged = mergeSettings(current, style.overrides);
  return merged;
}

export function resolveThemeMode(mode: ThemeMode, systemDark: boolean): "light" | "dark" {
  if (mode === "system") return systemDark ? "dark" : "light";
  return mode;
}

export function activePalette(settings: AppearanceSettings, systemDark: boolean): ColorPalette {
  return resolveThemeMode(settings.mode, systemDark) === "dark" ? settings.palettes.dark : settings.palettes.light;
}

export function fontStack(font: FontFamily): { body: string; heading: string } {
  const option = FONT_OPTIONS.find((item) => item.id === font) ?? FONT_OPTIONS[0];
  return { body: option.body, heading: option.heading };
}

export function appearanceCssVars(settings: AppearanceSettings, systemDark: boolean): Record<string, string> {
  const colors = activePalette(settings, systemDark);
  const fonts = fontStack(settings.typography.fontFamily);
  const resolved = resolveThemeMode(settings.mode, systemDark);
  const bgImage =
    settings.background.type === "image" && settings.background.imageUrl
      ? `url("${settings.background.imageUrl}")`
      : settings.background.type === "gradient"
        ? `linear-gradient(160deg, ${settings.background.gradientFrom}, ${settings.background.gradientTo})`
        : "none";
  const radius = `${settings.layout.radius}px`;
  const padding = settings.layout.density === "compact" ? "18px" : "28px";

  return {
    "--bg": colors.background,
    "--surface": colors.surface,
    "--card": colors.card,
    "--text": colors.text,
    "--muted": colors.muted,
    "--primary": colors.primary,
    "--primary-contrast": colors.primaryText,
    "--accent": colors.accent,
    "--border": colors.border,
    "--selected": colors.selected,
    "--selected-contrast": colors.selectedText,
    "--today": colors.today,
    "--danger": colors.danger,
    "--radius": radius,
    "--radius-sm": `${Math.max(4, settings.layout.radius * 0.55)}px`,
    "--radius-lg": `${settings.layout.radius * 1.5}px`,
    "--shadow": SHADOWS[settings.layout.shadow],
    "--font-body": fonts.body,
    "--font-heading": fonts.heading,
    "--font-size-base": `${settings.typography.baseSize}px`,
    "--heading-scale": String(settings.typography.headingScale),
    "--line-height": String(settings.typography.lineHeight),
    "--letter-spacing": `${settings.typography.letterSpacing}px`,
    "--page-width": `${settings.layout.pageWidth}px`,
    "--content-align": settings.layout.align === "center" ? "center" : "flex-start",
    "--cell-size": `${settings.layout.cellSize}px`,
    "--cell-gap": `${settings.layout.cellGap}px`,
    "--content-pad": padding,
    "--bg-image": bgImage,
    "--bg-overlay-opacity": settings.background.type === "image" ? String(settings.background.overlayOpacity) : "0",
    "--image-radius":
      settings.imageStyle === "sharp"
        ? "2px"
        : settings.imageStyle === "polaroid"
          ? "3px"
          : settings.imageStyle === "soft"
            ? "calc(var(--radius) * 0.7)"
            : "calc(var(--radius) * 0.5)",
    "--nav-width": "248px",
    "--calendar-grid-style": settings.calendar.gridStyle,
    "--calendar-indicator": settings.calendar.entryIndicator,
    "--theme-mode": resolved,
  };
}

export function applyAppearance(settings: AppearanceSettings, systemDark: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = appearanceCssVars(settings, systemDark);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = resolveThemeMode(settings.mode, systemDark);
  root.dataset.grid = settings.calendar.gridStyle;
  root.dataset.nav = settings.layout.nav;
  root.dataset.density = settings.layout.density;
  root.dataset.imageStyle = settings.imageStyle;
  root.dataset.indicator = settings.calendar.entryIndicator;
  root.style.colorScheme = resolveThemeMode(settings.mode, systemDark);
}

export function defaultSettingsForLocale(locale: Locale): AppearanceSettings {
  return { ...clone(DEFAULT_SETTINGS), locale };
}
