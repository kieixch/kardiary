"use client";

import { Toaster } from "sonner";
import { useAppearance } from "@/components/app/appearance-provider";
import { resolveThemeMode } from "@/lib/appearance";

export function AppToaster() {
  const { settings, systemDark } = useAppearance();
  const theme = resolveThemeMode(settings.mode, systemDark);
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
        },
      }}
    />
  );
}
