"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { colorForName } from "@/lib/tag-colors";
import type { TagDTO } from "@/lib/types";

interface TagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
  allTags: TagDTO[];
  maxTags?: number;
}

export function TagPicker({ value, onChange, allTags, maxTags = 20 }: TagPickerProps) {
  const { t } = useAppearance();
  const listId = useId();
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const name = raw.trim().replace(/^#/, "");
    if (!name) return;
    const exists = value.some((tag) => tag.toLowerCase() === name.toLowerCase());
    if (exists || value.length >= maxTags) {
      setInput("");
      return;
    }
    onChange([...value, name]);
    setInput("");
  }

  function removeTag(name: string) {
    onChange(value.filter((tag) => tag !== name));
  }

  function colorOf(name: string) {
    return allTags.find((tag) => tag.name.toLowerCase() === name.toLowerCase())?.color ?? colorForName(name);
  }

  return (
    <div>
      <span className="label">{t("tags")}</span>
      <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-medium"
            style={{
              backgroundColor: `${colorOf(tag)}1f`,
              border: `1px solid ${colorOf(tag)}66`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorOf(tag) }} />
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`${t("remove")} ${tag}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <div className="flex min-w-[110px] flex-1 items-center gap-1">
          <Plus size={13} className="text-[var(--muted)]" />
          <input
            value={input}
            list={listId}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(input);
              } else if (event.key === "Backspace" && !input && value.length > 0) {
                removeTag(value[value.length - 1]);
              }
            }}
            onBlur={() => addTag(input)}
            placeholder={t("addTag")}
            className="min-w-0 flex-1 bg-transparent py-0.5 text-[0.82rem] outline-none placeholder:text-[var(--muted)]"
            disabled={value.length >= maxTags}
          />
          <datalist id={listId}>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.name} />
            ))}
          </datalist>
        </div>
      </div>
      <p className="mt-1 text-[0.68rem] text-[var(--muted)]">{t("tagsHelp")}</p>
    </div>
  );
}
