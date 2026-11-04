"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { EntryImageDTO } from "@/lib/types";

interface ImageLightboxProps {
  images: EntryImageDTO[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const { t } = useAppearance();
  const image = index !== null ? images[index] : undefined;

  useEffect(() => {
    if (index === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && index < images.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, images.length, onIndexChange]);

  if (!image || index === null) return null;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        wide
        hideClose
        title={image.caption || t("viewImages")}
        description={`${index + 1} / ${images.length}`}
        className="max-w-5xl"
      >
        <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--text)_8%,var(--surface))] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.caption || image.originalFilename}
            className="lightbox-image"
          />
          {index > 0 ? (
            <button
              type="button"
              onClick={() => onIndexChange(index - 1)}
              className="icon-btn absolute left-3 top-1/2 -translate-y-1/2"
              aria-label={t("previous")}
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}
          {index < images.length - 1 ? (
            <button
              type="button"
              onClick={() => onIndexChange(index + 1)}
              className="icon-btn absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={t("next")}
            >
              <ChevronRight size={18} />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {image.caption ? <p className="text-sm text-[var(--muted)]">{image.caption}</p> : <span />}
          <a href={image.url} download={image.originalFilename} className="btn btn-secondary btn-sm">
            <Download size={14} />
            {t("download")}
          </a>
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onIndexChange(itemIndex)}
                className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[8px] border-2"
                style={{
                  borderColor: itemIndex === index ? "var(--primary)" : "transparent",
                  opacity: itemIndex === index ? 1 : 0.65,
                }}
                aria-label={`${t("photoOf")} ${itemIndex + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="icon-btn absolute right-4 top-4"
          onClick={onClose}
          aria-label={t("close")}
        >
          ✕
        </button>
      </DialogContent>
    </Dialog>
  );
}
