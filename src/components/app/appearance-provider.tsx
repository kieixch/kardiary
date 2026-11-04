"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  DEFAULT_SETTINGS,
  applyAppearance,
  defaultSettingsForLocale,
  mergeSettings,
  normalizeSettings,
  settingsFromCalendarStyle,
  settingsFromPreset,
  type AppearancePreset,
  type AppearanceSettings,
  type CalendarStylePreset,
  type DeepPartial,
  type Locale,
} from "@/lib/appearance";
import { api } from "@/lib/api";
import { idbSet, localKeys } from "@/lib/idb";
import { createTranslator, type MessageKey } from "@/lib/i18n";

interface AppearanceContextValue {
  settings: AppearanceSettings;
  locale: Locale;
  ready: boolean;
  saving: boolean;
  savedAt: Date | null;
  syncError: string | null;
  systemDark: boolean;
  updateSettings: (patch: DeepPartial<AppearanceSettings>) => void;
  replaceSettings: (settings: AppearanceSettings, dirty?: boolean) => void;
  applyPreset: (preset: AppearancePreset) => void;
  applyCalendarStyle: (style: CalendarStylePreset) => void;
  resetAppearance: () => void;
  saveNow: () => Promise<boolean>;
  refresh: () => Promise<void>;
  t: (key: MessageKey) => string;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function readLocalSettings(): { settings: AppearanceSettings; savedAt: number | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localKeys.settings);
    if (!raw) return null;
    const savedAtRaw = window.localStorage.getItem(localKeys.settingsSavedAt);
    const savedAt = savedAtRaw ? Date.parse(savedAtRaw) : null;
    return {
      settings: normalizeSettings(JSON.parse(raw) as unknown),
      savedAt: savedAt && Number.isFinite(savedAt) ? savedAt : null,
    };
  } catch {
    return null;
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [systemDark, setSystemDark] = useState(false);

  const settingsRef = useRef(settings);
  const dirtyRef = useRef(false);
  const changeRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const commit = useCallback((next: AppearanceSettings, dirty: boolean) => {
    if (dirty) {
      dirtyRef.current = true;
      changeRef.current += 1;
    }
    setSettings(normalizeSettings(next));
  }, []);

  const updateSettings = useCallback(
    (patch: DeepPartial<AppearanceSettings>) => {
      dirtyRef.current = true;
      changeRef.current += 1;
      setSettings((current) => normalizeSettings(mergeSettings(current, patch)));
    },
    [],
  );

  const replaceSettings = useCallback(
    (next: AppearanceSettings, dirty = true) => {
      commit(next, dirty);
    },
    [commit],
  );

  const applyPreset = useCallback(
    (preset: AppearancePreset) => {
      commit(settingsFromPreset(preset, settingsRef.current), true);
    },
    [commit],
  );

  const applyCalendarStyle = useCallback(
    (style: CalendarStylePreset) => {
      commit(settingsFromCalendarStyle(style, settingsRef.current), true);
    },
    [commit],
  );

  const resetAppearance = useCallback(() => {
    commit(defaultSettingsForLocale(settingsRef.current.locale), true);
  }, [commit]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    const snapshot = settingsRef.current;
    const version = changeRef.current;
    setSaving(true);
    setSyncError(null);
    try {
      const result = await api.saveSettings(snapshot);
      if (!mountedRef.current) return true;
      if (version === changeRef.current) {
        dirtyRef.current = false;
      }
      const timestamp = new Date(result.updatedAt);
      setSavedAt(timestamp);
      window.localStorage.setItem(localKeys.settingsSavedAt, result.updatedAt);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save appearance";
      setSyncError(message);
      toast.error(message);
      return false;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await api.getSettings();
      if (!mountedRef.current) return;
      if (!dirtyRef.current) {
        commit(result.settings, false);
        if (result.updatedAt) {
          window.localStorage.setItem(localKeys.settingsSavedAt, result.updatedAt);
          setSavedAt(new Date(result.updatedAt));
        }
      }
    } catch {
      // Keep the cached appearance when the local server is unavailable.
    }
  }, [commit]);

  useEffect(() => {
    mountedRef.current = true;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => {
      mountedRef.current = false;
      media.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = readLocalSettings();
      if (local && !cancelled) {
        commit(local.settings, false);
        if (local.savedAt) setSavedAt(new Date(local.savedAt));
      }
      try {
        const server = await api.getSettings();
        if (cancelled) return;
        const serverSaved = server.updatedAt ? Date.parse(server.updatedAt) : 0;
        const localSaved = local?.savedAt ?? 0;
        const useServer = !local || (serverSaved > 0 && serverSaved >= localSaved);
        if (useServer && !dirtyRef.current) {
          commit(server.settings, false);
          window.localStorage.setItem(localKeys.settings, JSON.stringify(server.settings));
          if (server.updatedAt) {
            window.localStorage.setItem(localKeys.settingsSavedAt, server.updatedAt);
            setSavedAt(new Date(server.updatedAt));
          }
        }
      } catch {
        // The app remains usable with cached local appearance.
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [commit]);

  useEffect(() => {
    applyAppearance(settings, systemDark);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(localKeys.settings, JSON.stringify(settings));
    window.localStorage.setItem(localKeys.settingsSavedAt, new Date().toISOString());
    void idbSet(localKeys.settings, settings);
    document.documentElement.lang = settings.locale;
  }, [settings, systemDark]);

  useEffect(() => {
    if (!ready || !dirtyRef.current) return;
    const timer = window.setTimeout(() => {
      void saveNow();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [settings, ready, saveNow]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest(".ProseMirror")) {
          event.preventDefault();
          void saveNow();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveNow]);

  const t = useMemo(() => createTranslator(settings.locale), [settings.locale]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      settings,
      locale: settings.locale,
      ready,
      saving,
      savedAt,
      syncError,
      systemDark,
      updateSettings,
      replaceSettings,
      applyPreset,
      applyCalendarStyle,
      resetAppearance,
      saveNow,
      refresh,
      t,
    }),
    [
      settings,
      ready,
      saving,
      savedAt,
      syncError,
      systemDark,
      updateSettings,
      replaceSettings,
      applyPreset,
      applyCalendarStyle,
      resetAppearance,
      saveNow,
      refresh,
      t,
    ],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used inside AppearanceProvider");
  return context;
}
