"use client";

import { X } from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { moodLabel } from "@/lib/moods";

interface MoodPickerProps {
  value: string | null;
  onChange: (mood: string | null) => void;
  compact?: boolean;
}

export function MoodPicker({ value, onChange, compact }: MoodPickerProps) {
  const { settings, locale, t } = useAppearance();
  const moods = settings.moods.filter((mood) => mood.enabled || mood.id === value);

  if (moods.length === 0) return null;

  return (
    <div>
      {compact ? null : <span className="label">{t("moodOptional")}</span>}
      <div className="flex flex-wrap gap-1.5">
        {moods.map((mood) => {
          const active = value === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              className="chip"
              data-active={active}
              aria-pressed={active}
              title={moodLabel(mood, locale)}
              style={
                active
                  ? {
                      backgroundColor: `${mood.color}24`,
                      borderColor: `${mood.color}80`,
                      color: "var(--text)",
                    }
                  : undefined
              }
              onClick={() => onChange(active ? null : mood.id)}
            >
              <span aria-hidden>{mood.emoji}</span>
              <span className={compact ? "hidden sm:inline" : undefined}>{moodLabel(mood, locale)}</span>
            </button>
          );
        })}
        {value ? (
          <button type="button" className="chip" onClick={() => onChange(null)} title={t("none")}>
            <X size={12} />
            {t("none")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
