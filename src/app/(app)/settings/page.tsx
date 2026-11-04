"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Database,
  Download,
  FileJson,
  FileText,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAppearance } from "@/components/app/appearance-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toggle } from "@/components/ui/toggle";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import {
  CALENDAR_STYLES,
  FONT_OPTIONS,
  PRESETS,
  type ColorPalette,
  type GridStyle,
  type ImageStyle,
  type Locale,
  type ThemeMode,
} from "@/lib/appearance";
import { formatDateTime, todayKey } from "@/lib/date";
import type { MessageKey } from "@/lib/i18n";
import type { ImportResult, TagDTO } from "@/lib/types";
import { cn, downloadUrl, formatBytes } from "@/lib/utils";

type Tab = "appearance" | "data";
type PaletteTab = "light" | "dark";

const COLOR_FIELDS: { key: keyof ColorPalette; label: MessageKey }[] = [
  { key: "background", label: "colorBackground" },
  { key: "surface", label: "colorSurface" },
  { key: "card", label: "colorCard" },
  { key: "text", label: "colorText" },
  { key: "muted", label: "colorMuted" },
  { key: "primary", label: "colorPrimary" },
  { key: "primaryText", label: "colorPrimaryText" },
  { key: "accent", label: "colorAccent" },
  { key: "border", label: "colorBorder" },
  { key: "selected", label: "colorSelected" },
  { key: "selectedText", label: "colorSelectedText" },
  { key: "today", label: "colorToday" },
  { key: "danger", label: "colorDanger" },
];

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2"
      />
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="chip"
          data-active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings,
    locale,
    t,
    updateSettings,
    applyPreset,
    applyCalendarStyle,
    resetAppearance,
    saveNow,
    saving,
    savedAt,
    syncError,
    systemDark,
    refresh,
  } = useAppearance();
  const [tab, setTab] = useState<Tab>("appearance");
  const [paletteTab, setPaletteTab] = useState<PaletteTab>("light");
  const [resetOpen, setResetOpen] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const [tags, setTags] = useState<TagDTO[]>([]);
  const [tagDrafts, setTagDrafts] = useState<Record<string, { name: string; color: string }>>({});
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#C9A227");
  const [tagToDelete, setTagToDelete] = useState<TagDTO | null>(null);
  const [tagPending, setTagPending] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<unknown>(null);
  const [importStrategy, setImportStrategy] = useState<"skip" | "overwrite">("skip");
  const [applyImportedSettings, setApplyImportedSettings] = useState(false);
  const [backupHasSettings, setBackupHasSettings] = useState(false);
  const [inspectResult, setInspectResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function loadTags() {
    try {
      const result = await api.listTags();
      setTags(result.tags);
      setTagDrafts(
        Object.fromEntries(result.tags.map((tag) => [tag.id, { name: tag.name, color: tag.color }])),
      );
    } catch {
      // Tags are also manageable from entries; keep the section usable.
    }
  }

  useEffect(() => {
    void loadTags();
  }, []);

  useEffect(() => {
    if (settings.mode === "system") {
      setPaletteTab(systemDark ? "dark" : "light");
    } else {
      setPaletteTab(settings.mode);
    }
  }, [settings.mode, systemDark]);

  const activePalette = settings.palettes[paletteTab];

  function updatePaletteColor(key: keyof ColorPalette, value: string) {
    updateSettings({
      palettes: {
        [paletteTab]: {
          ...activePalette,
          [key]: value,
        },
      },
    });
  }

  async function handleBackgroundFile(file: File | undefined) {
    if (!file) return;
    setBackgroundUploading(true);
    try {
      const result = await api.uploadImage(file, "background");
      updateSettings({ background: { type: "image", imageUrl: result.image.url } });
      toast.success(t("uploadBackground"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadError"));
    } finally {
      setBackgroundUploading(false);
    }
  }

  function updateMood(index: number, patch: Partial<(typeof settings.moods)[number]>) {
    const moods = settings.moods.map((mood, moodIndex) =>
      moodIndex === index ? { ...mood, ...patch } : mood,
    );
    updateSettings({ moods });
  }

  function moveMood(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= settings.moods.length) return;
    const moods = [...settings.moods];
    const [item] = moods.splice(index, 1);
    moods.splice(target, 0, item);
    updateSettings({ moods });
  }

  function addMood() {
    if (settings.moods.length >= 30) return;
    updateSettings({
      moods: [
        ...settings.moods,
        {
          id: `custom-${Date.now()}`,
          label: t("newMood"),
          labelEn: "New mood",
          emoji: "🌟",
          color: "#8A9A7B",
          enabled: true,
        },
      ],
    });
  }

  function removeMood(index: number) {
    if (settings.moods.length <= 1) return;
    updateSettings({ moods: settings.moods.filter((_, moodIndex) => moodIndex !== index) });
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    try {
      await api.createTag(name, newTagColor);
      setNewTagName("");
      setNewTagColor("#C9A227");
      await loadTags();
      toast.success(t("newTag"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    }
  }

  async function saveTag(tag: TagDTO) {
    const draft = tagDrafts[tag.id];
    if (!draft) return;
    try {
      await api.updateTag(tag.id, { name: draft.name.trim(), color: draft.color });
      await loadTags();
      toast.success(t("saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    }
  }

  async function confirmDeleteTag() {
    if (!tagToDelete) return;
    setTagPending(true);
    try {
      await api.deleteTag(tagToDelete.id);
      setTagToDelete(null);
      await loadTags();
      toast.success(t("deleteTag"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setTagPending(false);
    }
  }

  function exportBackup(format: "json" | "md" | "html") {
    const extension = format === "json" ? "json" : format === "md" ? "md" : "html";
    downloadUrl(
      `/api/export?format=${format}&locale=${locale}`,
      `kardiary-${todayKey()}.${extension}`,
    );
    toast.success(t("exportSuccess"));
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    setImportFile(file);
    setInspectResult(null);
    setImportResult(null);
    setImportError(null);
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      setImportData(parsed);
      setBackupHasSettings(Boolean(parsed.settings));
      setApplyImportedSettings(Boolean(parsed.settings));
    } catch {
      setImportData(null);
      setBackupHasSettings(false);
      setImportError(t("importInvalid"));
    }
  }

  async function inspectImport() {
    if (!importData) return;
    setInspecting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await api.inspectImport(importData, importStrategy, applyImportedSettings);
      setInspectResult(result.result);
      if (!result.result.valid) setImportError(t("importInvalid"));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t("importFailed"));
    } finally {
      setInspecting(false);
    }
  }

  async function runImport() {
    if (!importData) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await api.runImport(importData, importStrategy, applyImportedSettings);
      setImportResult(result.result);
      toast.success(t("importComplete"));
      if (applyImportedSettings) await refresh();
      setImportFile(null);
      setImportData(null);
      if (importInputRef.current) importInputRef.current.value = "";
      await loadTags();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t("importFailed"));
    } finally {
      setImporting(false);
    }
  }

  const activePreset = PRESETS.find((preset) => preset.id === settings.presetId);
  const statusText = saving
    ? t("saving")
    : savedAt
      ? `${t("savedAt")} ${formatDateTime(savedAt, locale)}`
      : t("saved");

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={t("navAppearance")}
        title={t("settingsTitle")}
        subtitle={t("settingsSubtitle")}
        actions={
          <>
            <span className="hidden items-center gap-1.5 text-xs text-[var(--muted)] sm:flex">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} className="text-[var(--primary)]" />}
              {statusText}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void saveNow().then((ok) => {
                  if (ok) toast.success(t("savedSettings"));
                });
              }}
              disabled={saving}
            >
              <Save size={15} />
              {t("saveNow")}
            </button>
          </>
        }
      />

      {syncError ? (
        <div className="card mb-4 border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--card))] p-3 text-sm">
          {syncError}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="pill-tabs">
          <button type="button" data-active={tab === "appearance"} onClick={() => setTab("appearance")}>
            {t("appearance")}
          </button>
          <button type="button" data-active={tab === "data"} onClick={() => setTab("data")}>
            {t("data")}
          </button>
        </div>
        {tab === "appearance" ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetOpen(true)}>
            <RotateCcw size={14} />
            {t("resetAppearance")}
          </button>
        ) : null}
      </div>

      {tab === "appearance" ? (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold">{t("presets")}</h2>
              <p className="text-xs text-[var(--muted)]">{t("presetsHelp")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PRESETS.map((preset) => {
                const active = activePreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      "rounded-[var(--radius)] border p-3.5 text-left transition",
                      active
                        ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--card))]"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]",
                    )}
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-[0.95rem] font-semibold">
                        {locale === "id" ? preset.name : preset.nameEn}
                      </span>
                      {active ? <Check size={15} className="text-[var(--primary)]" /> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                      {locale === "id" ? preset.description : preset.descriptionEn}
                    </p>
                    <div className="mt-2.5 flex gap-1.5">
                      {preset.swatches.map((color) => (
                        <span
                          key={color}
                          className="swatch h-5 w-5 rounded-[5px]"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold">{t("calendarStyles")}</h2>
              <p className="text-xs text-[var(--muted)]">{t("calendarStylesHelp")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
              {CALENDAR_STYLES.map((style) => {
                const active =
                  style.id === "dark-journal"
                    ? settings.calendar.gridStyle === "journal"
                    : settings.calendar.gridStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={cn(
                      "rounded-[var(--radius-sm)] border p-3 text-left text-sm font-semibold transition",
                      active
                        ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))]"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]",
                    )}
                    onClick={() => applyCalendarStyle(style)}
                  >
                    <span className="block h-8 rounded-[4px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--selected),var(--card))]" />
                    <span className="mt-2 block">{locale === "id" ? style.name : style.nameEn}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold">{t("themeMode")}</h2>
              <Segmented
                value={settings.mode}
                onChange={(mode: ThemeMode) => updateSettings({ mode })}
                options={[
                  { value: "light", label: t("light"), icon: <Sun size={14} /> },
                  { value: "dark", label: t("dark"), icon: <Moon size={14} /> },
                  { value: "system", label: t("system"), icon: <Monitor size={14} /> },
                ]}
              />

              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{t("palette")}</h3>
                <div className="pill-tabs">
                  <button
                    type="button"
                    data-active={paletteTab === "light"}
                    onClick={() => setPaletteTab("light")}
                  >
                    {t("lightPalette")}
                  </button>
                  <button
                    type="button"
                    data-active={paletteTab === "dark"}
                    onClick={() => setPaletteTab("dark")}
                  >
                    {t("darkPalette")}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {COLOR_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center justify-between gap-2 rounded-[8px] border border-[var(--border)] px-2 py-1.5">
                    <span className="text-[0.72rem] text-[var(--muted)]">{t(field.label)}</span>
                    <span className="color-input">
                      <input
                        type="color"
                        value={activePalette[field.key]}
                        onChange={(event) => updatePaletteColor(field.key, event.target.value)}
                        aria-label={t(field.label)}
                      />
                      <span className="font-mono text-[0.62rem] uppercase">{activePalette[field.key]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold">{t("backgroundSection")}</h2>
              <Segmented
                value={settings.background.type}
                onChange={(type: "solid" | "gradient" | "image") =>
                  updateSettings({ background: { type } })
                }
                options={[
                  { value: "solid", label: t("solid") },
                  { value: "gradient", label: t("gradient") },
                  { value: "image", label: t("backgroundImage") },
                ]}
              />

              {settings.background.type === "solid" ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
                  <span className="text-sm text-[var(--muted)]">{t("colorBackground")}</span>
                  <span className="color-input">
                    <input
                      type="color"
                      value={activePalette.background}
                      onChange={(event) => updatePaletteColor("background", event.target.value)}
                      aria-label={t("colorBackground")}
                    />
                    <span className="font-mono text-[0.64rem] uppercase">{activePalette.background}</span>
                  </span>
                </div>
              ) : null}

              {settings.background.type === "gradient" ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <span className="label">{t("gradient")} 1</span>
                    <span className="color-input w-full justify-between">
                      <input
                        type="color"
                        value={settings.background.gradientFrom}
                        onChange={(event) =>
                          updateSettings({ background: { gradientFrom: event.target.value } })
                        }
                        aria-label={`${t("gradient")} 1`}
                      />
                      <span className="font-mono text-[0.62rem] uppercase">{settings.background.gradientFrom}</span>
                    </span>
                  </div>
                  <div>
                    <span className="label">{t("gradient")} 2</span>
                    <span className="color-input w-full justify-between">
                      <input
                        type="color"
                        value={settings.background.gradientTo}
                        onChange={(event) =>
                          updateSettings({ background: { gradientTo: event.target.value } })
                        }
                        aria-label={`${t("gradient")} 2`}
                      />
                      <span className="font-mono text-[0.62rem] uppercase">{settings.background.gradientTo}</span>
                    </span>
                  </div>
                </div>
              ) : null}

              {settings.background.type === "image" ? (
                <div className="mt-4 space-y-3">
                  {settings.background.imageUrl ? (
                    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.background.imageUrl}
                        alt=""
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] text-[var(--muted)]">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => backgroundInputRef.current?.click()}
                      disabled={backgroundUploading}
                    >
                      {backgroundUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {settings.background.imageUrl ? t("changeBackground") : t("uploadBackground")}
                    </button>
                    {settings.background.imageUrl ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => updateSettings({ background: { imageUrl: "" } })}
                      >
                        <X size={14} />
                        {t("removeBackground")}
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => {
                      void handleBackgroundFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <RangeField
                    label={t("overlay")}
                    value={Math.round(settings.background.overlayOpacity * 100)}
                    min={0}
                    max={100}
                    step={5}
                    suffix="%"
                    onChange={(value) =>
                      updateSettings({ background: { overlayOpacity: value / 100 } })
                    }
                  />
                  <p className="text-[0.68rem] text-[var(--muted)]">{t("overlayHelp")}</p>
                </div>
              ) : null}
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold">{t("typography")}</h2>
              <div>
                <label className="label" htmlFor="fontFamily">
                  {t("fontFamily")}
                </label>
                <select
                  id="fontFamily"
                  className="select"
                  value={settings.typography.fontFamily}
                  onChange={(event) =>
                    updateSettings({
                      typography: {
                        fontFamily: event.target.value as (typeof FONT_OPTIONS)[number]["id"],
                      },
                    })
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {locale === "id" ? font.label : font.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 space-y-4">
                <RangeField
                  label={t("baseSize")}
                  value={settings.typography.baseSize}
                  min={13}
                  max={22}
                  step={1}
                  suffix="px"
                  onChange={(value) => updateSettings({ typography: { baseSize: value } })}
                />
                <RangeField
                  label={t("headingScale")}
                  value={settings.typography.headingScale}
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  onChange={(value) => updateSettings({ typography: { headingScale: value } })}
                />
                <RangeField
                  label={t("lineHeight")}
                  value={settings.typography.lineHeight}
                  min={1.2}
                  max={2.2}
                  step={0.05}
                  onChange={(value) => updateSettings({ typography: { lineHeight: value } })}
                />
                <RangeField
                  label={t("letterSpacing")}
                  value={settings.typography.letterSpacing}
                  min={-0.5}
                  max={2}
                  step={0.1}
                  suffix="px"
                  onChange={(value) => updateSettings({ typography: { letterSpacing: value } })}
                />
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold">{t("layoutSection")}</h2>
              <div className="space-y-4">
                <div>
                  <span className="label">{t("navigation")}</span>
                  <Segmented
                    value={settings.layout.nav}
                    onChange={(nav: "sidebar" | "top") => updateSettings({ layout: { nav } })}
                    options={[
                      { value: "sidebar", label: t("sidebar") },
                      { value: "top", label: t("topNav") },
                    ]}
                  />
                </div>
                <div>
                  <span className="label">{t("density")}</span>
                  <Segmented
                    value={settings.layout.density}
                    onChange={(density: "compact" | "spacious") =>
                      updateSettings({ layout: { density } })
                    }
                    options={[
                      { value: "compact", label: t("compact") },
                      { value: "spacious", label: t("spacious") },
                    ]}
                  />
                </div>
                <div>
                  <span className="label">{t("alignment")}</span>
                  <Segmented
                    value={settings.layout.align}
                    onChange={(align: "left" | "center") => updateSettings({ layout: { align } })}
                    options={[
                      { value: "left", label: t("left") },
                      { value: "center", label: t("center") },
                    ]}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="shadow">
                    {t("shadow")}
                  </label>
                  <select
                    id="shadow"
                    className="select"
                    value={settings.layout.shadow}
                    onChange={(event) =>
                      updateSettings({
                        layout: {
                          shadow: event.target.value as "none" | "soft" | "medium" | "strong",
                        },
                      })
                    }
                  >
                    <option value="none">{t("shadowNone")}</option>
                    <option value="soft">{t("shadowSoft")}</option>
                    <option value="medium">{t("shadowMedium")}</option>
                    <option value="strong">{t("shadowStrong")}</option>
                  </select>
                </div>
                <RangeField
                  label={t("pageWidth")}
                  value={settings.layout.pageWidth}
                  min={760}
                  max={1800}
                  step={20}
                  suffix="px"
                  onChange={(value) => updateSettings({ layout: { pageWidth: value } })}
                />
                <RangeField
                  label={t("cornerRadius")}
                  value={settings.layout.radius}
                  min={0}
                  max={40}
                  step={1}
                  suffix="px"
                  onChange={(value) => updateSettings({ layout: { radius: value } })}
                />
                <RangeField
                  label={t("cellSize")}
                  value={settings.layout.cellSize}
                  min={60}
                  max={160}
                  step={2}
                  suffix="px"
                  onChange={(value) => updateSettings({ layout: { cellSize: value } })}
                />
                <RangeField
                  label={t("cellGap")}
                  value={settings.layout.cellGap}
                  min={0}
                  max={24}
                  step={1}
                  suffix="px"
                  onChange={(value) => updateSettings({ layout: { cellGap: value } })}
                />
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold">{t("calendarSection")}</h2>
              <div className="space-y-3">
                <div>
                  <label className="label" htmlFor="weekStart">
                    {t("weekStart")}
                  </label>
                  <select
                    id="weekStart"
                    className="select"
                    value={settings.calendar.firstDayOfWeek}
                    onChange={(event) =>
                      updateSettings({
                        calendar: { firstDayOfWeek: Number(event.target.value) === 0 ? 0 : 1 },
                      })
                    }
                  >
                    <option value={1}>{t("monday")}</option>
                    <option value={0}>{t("sunday")}</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="indicator">
                    {t("entryIndicator")}
                  </label>
                  <select
                    id="indicator"
                    className="select"
                    value={settings.calendar.entryIndicator}
                    onChange={(event) =>
                      updateSettings({
                        calendar: {
                          entryIndicator: event.target.value as
                            | "dot"
                            | "underline"
                            | "badge"
                            | "glow",
                        },
                      })
                    }
                  >
                    <option value="dot">{t("indicatorDot")}</option>
                    <option value="underline">{t("indicatorUnderline")}</option>
                    <option value="badge">{t("indicatorBadge")}</option>
                    <option value="glow">{t("indicatorGlow")}</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="gridStyle">
                    {t("calendarStyles")}
                  </label>
                  <select
                    id="gridStyle"
                    className="select"
                    value={settings.calendar.gridStyle}
                    onChange={(event) =>
                      updateSettings({ calendar: { gridStyle: event.target.value as GridStyle } })
                    }
                  >
                    <option value="minimal">Minimal</option>
                    <option value="cards">Cards</option>
                    <option value="scrapbook">Scrapbook</option>
                    <option value="polaroid">Polaroid</option>
                    <option value="pastel">Soft Pastel</option>
                    <option value="journal">Journal</option>
                  </select>
                </div>
                <SettingToggle
                  label={t("showMoodIndicators")}
                  checked={settings.calendar.showMood}
                  onChange={(showMood) => updateSettings({ calendar: { showMood } })}
                />
                <SettingToggle
                  label={t("showThumbnails")}
                  checked={settings.calendar.showThumbnails}
                  onChange={(showThumbnails) => updateSettings({ calendar: { showThumbnails } })}
                />
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold">{t("imageStyle")}</h2>
              <Segmented
                value={settings.imageStyle}
                onChange={(imageStyle: ImageStyle) => updateSettings({ imageStyle })}
                options={[
                  { value: "rounded", label: t("rounded") },
                  { value: "polaroid", label: t("polaroid") },
                  { value: "sharp", label: t("sharp") },
                  { value: "soft", label: t("soft") },
                ]}
              />

              <h2 className="mb-3 mt-6 font-serif text-lg font-semibold">{t("languageSection")}</h2>
              <div className="flex flex-wrap gap-2">
                {(["id", "en"] as Locale[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip"
                    data-active={settings.locale === item}
                    onClick={() => updateSettings({ locale: item })}
                  >
                    <Globe size={13} />
                    {item === "id" ? t("indonesian") : t("english")}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold">{t("moodsSection")}</h2>
                <p className="text-xs text-[var(--muted)]">{t("moodsHelp")}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addMood}
                disabled={settings.moods.length >= 30}
              >
                <Plus size={14} />
                {t("newMood")}
              </button>
            </div>
            <div className="space-y-2.5">
              {settings.moods.map((mood, index) => (
                <div
                  key={mood.id}
                  className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-2.5"
                >
                  <input
                    value={mood.emoji}
                    onChange={(event) => updateMood(index, { emoji: event.target.value.slice(0, 8) })}
                    className="input w-12 text-center"
                    aria-label={t("moodEmoji")}
                    maxLength={8}
                  />
                  <input
                    value={mood.label}
                    onChange={(event) => updateMood(index, { label: event.target.value.slice(0, 40) })}
                    className="input min-w-[110px] flex-1"
                    aria-label={t("moodName")}
                    placeholder={t("moodName")}
                    maxLength={40}
                  />
                  <input
                    value={mood.labelEn}
                    onChange={(event) => updateMood(index, { labelEn: event.target.value.slice(0, 40) })}
                    className="input min-w-[110px] flex-1"
                    aria-label={`${t("moodName")} (English)`}
                    placeholder={`${t("moodName")} (English)`}
                    maxLength={40}
                  />
                  <span className="color-input">
                    <input
                      type="color"
                      value={mood.color}
                      onChange={(event) => updateMood(index, { color: event.target.value })}
                      aria-label={t("color")}
                    />
                  </span>
                  <Toggle
                    checked={mood.enabled}
                    onChange={(enabled) => updateMood(index, { enabled })}
                    label={`${t("moodsSection")}: ${mood.label}`}
                  />
                  <button
                    type="button"
                    className="icon-btn h-8 w-8"
                    onClick={() => moveMood(index, -1)}
                    disabled={index === 0}
                    aria-label={t("moveUp")}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-8 w-8"
                    onClick={() => moveMood(index, 1)}
                    disabled={index === settings.moods.length - 1}
                    aria-label={t("moveDown")}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-8 w-8 text-[var(--danger)]"
                    onClick={() => removeMood(index)}
                    disabled={settings.moods.length <= 1}
                    aria-label={t("delete")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold">{t("tagsSection")}</h2>
              <p className="text-xs text-[var(--muted)]">{t("tagsManageHelp")}</p>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder={t("tagName")}
                className="input max-w-[220px] flex-1"
                maxLength={40}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createTag();
                  }
                }}
              />
              <span className="color-input">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(event) => setNewTagColor(event.target.value)}
                  aria-label={t("tagColor")}
                />
              </span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void createTag()}>
                <Plus size={14} />
                {t("add")}
              </button>
            </div>

            {tags.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t("none")}</p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => {
                  const draft = tagDrafts[tag.id] ?? { name: tag.name, color: tag.color };
                  return (
                    <div
                      key={tag.id}
                      className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-2.5"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: draft.color }}
                      />
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          setTagDrafts((current) => ({
                            ...current,
                            [tag.id]: { ...draft, name: event.target.value },
                          }))
                        }
                        className="input max-w-[220px] flex-1"
                        aria-label={t("tagName")}
                        maxLength={40}
                      />
                      <span className="color-input">
                        <input
                          type="color"
                          value={draft.color}
                          onChange={(event) =>
                            setTagDrafts((current) => ({
                              ...current,
                              [tag.id]: { ...draft, color: event.target.value },
                            }))
                          }
                          aria-label={t("tagColor")}
                        />
                      </span>
                      <span className="badge">
                        {tag.count ?? 0} {t("entries")}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void saveTag(tag)}
                      >
                        <Save size={13} />
                        {t("save")}
                      </button>
                      <button
                        type="button"
                        className="icon-btn h-8 w-8 text-[var(--danger)]"
                        onClick={() => setTagToDelete(tag)}
                        aria-label={t("deleteTag")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[0.68rem] text-[var(--muted)]">{t("tagInUse")}</p>
          </section>

          <p className="px-1 text-xs leading-relaxed text-[var(--muted)]">{t("previewNote")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold">{t("exportAll")}</h2>
              <p className="text-xs text-[var(--muted)]">{t("backupIncludesImages")}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" className="btn btn-primary justify-start" onClick={() => exportBackup("json")}>
                <FileJson size={16} />
                {t("exportJson")}
              </button>
              <button type="button" className="btn btn-secondary justify-start" onClick={() => exportBackup("md")}>
                <FileText size={16} />
                {t("exportMarkdown")}
              </button>
              <button type="button" className="btn btn-secondary justify-start" onClick={() => exportBackup("html")}>
                <Download size={16} />
                {t("exportHtml")}
              </button>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">{t("exportEntryHelp")}</p>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold">{t("importBackup")}</h2>
              <p className="text-xs text-[var(--muted)]">{t("importMergeNote")}</p>
            </div>

            <label className="upload-zone block cursor-pointer">
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  void handleImportFile(event.target.files?.[0]);
                }}
              />
              <span className="flex flex-col items-center gap-2 text-sm text-[var(--muted)]">
                <Upload size={20} />
                <span>{importFile ? importFile.name : t("chooseBackup")}</span>
                {importFile ? (
                  <span className="text-[0.68rem]">{formatBytes(importFile.size)}</span>
                ) : null}
                <span className="btn btn-secondary btn-sm mt-1">{t("chooseBackup")}</span>
              </span>
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="importStrategy">
                  {t("importStrategy")}
                </label>
                <select
                  id="importStrategy"
                  className="select"
                  value={importStrategy}
                  onChange={(event) => {
                    setImportStrategy(event.target.value as "skip" | "overwrite");
                    setInspectResult(null);
                    setImportResult(null);
                  }}
                >
                  <option value="skip">{t("skipDuplicates")}</option>
                  <option value="overwrite">{t("overwriteDuplicates")}</option>
                </select>
              </div>
              {backupHasSettings ? (
                <div className="flex items-end pb-1">
                  <SettingToggle
                    label={t("appearance")}
                    checked={applyImportedSettings}
                    onChange={setApplyImportedSettings}
                  />
                </div>
              ) : null}
            </div>

            {importError ? (
              <p className="mt-3 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--card))] px-3 py-2 text-xs">
                {importError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void inspectImport()}
                disabled={!importData || inspecting || importing}
              >
                {inspecting ? <Loader2 size={14} className="animate-spin" /> : <FileJson size={14} />}
                {t("validateImport")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void runImport()}
                disabled={!inspectResult?.valid || importing || inspecting}
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {t("importConfirm")}
              </button>
            </div>

            {inspectResult ? (
              <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="text-sm font-semibold">{t("importPreview")}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="badge badge-primary">
                    {inspectResult.detected} {t("importDetected")}
                  </span>
                  <span className="badge">
                    {inspectResult.duplicates.length} {t("duplicatesFound")}
                  </span>
                  <span className="badge">
                    {inspectResult.images} {t("photos")}
                  </span>
                  <span className={inspectResult.valid ? "badge badge-primary" : "badge"}>
                    {inspectResult.valid ? t("yes") : t("no")}
                  </span>
                </div>
                {inspectResult.errors && inspectResult.errors.length > 0 ? (
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[0.68rem] text-[var(--danger)]">
                    {inspectResult.errors.slice(0, 20).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {importResult ? (
              <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] p-4">
                <h3 className="text-sm font-semibold">{t("importComplete")}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("importConfirm")}: {importResult.imported} · {t("skipDuplicates")}: {importResult.skipped} ·{" "}
                  {t("overwriteDuplicates")}: {importResult.overwritten} · {t("photos")}: {importResult.images}
                </p>
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold">
                <HardDrive size={17} />
                {t("aboutTitle")}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--muted)]">{t("aboutBody")}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{t("storageNote")}</p>
            </section>
            <section className="card p-5 sm:p-6">
              <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold">
                <ShieldCheck size={17} />
                {t("dangerZone")}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--muted)]">{t("securityNote")}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
                <Database size={14} />
                Neon Postgres · Cloudflare R2
              </div>
            </section>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t("resetAppearance")}
        description={t("resetConfirm")}
        confirmLabel={t("reset")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          resetAppearance();
          setResetOpen(false);
          toast.success(t("resetDone"));
        }}
      />

      <ConfirmDialog
        open={Boolean(tagToDelete)}
        onOpenChange={(open) => {
          if (!open) setTagToDelete(null);
        }}
        title={t("deleteTag")}
        description={tagToDelete ? `${tagToDelete.name} — ${t("tagInUse")}` : undefined}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        danger
        pending={tagPending}
        onConfirm={confirmDeleteTag}
      />

      <button
        type="button"
        className="btn btn-secondary btn-sm fixed bottom-24 right-4 z-20 shadow-lg xl:hidden"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={t("moveUp")}
      >
        <ArrowUp size={14} />
      </button>
    </div>
  );
}
