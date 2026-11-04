"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudSun,
  Copy,
  Download,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  PenLine,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAppearance } from "@/components/app/appearance-provider";
import { EntryCard } from "@/components/entry/entry-card";
import { ImageLightbox } from "@/components/entry/image-lightbox";
import { MoodPicker } from "@/components/entry/mood-picker";
import { RichTextEditor } from "@/components/entry/rich-text-editor";
import { TagPicker } from "@/components/entry/tag-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import {
  dayOfDateKey,
  formatDateTime,
  formatLongDate,
  formatMonthLong,
  isValidDateKey,
  monthOfDateKey,
  shiftDateKey,
  todayKey,
} from "@/lib/date";
import { idbDelete, idbGet, idbSet, localKeys } from "@/lib/idb";
import { findMood, moodLabel } from "@/lib/moods";
import type { EntryDetail, EntryImageDTO, EntrySummary, TagDTO } from "@/lib/types";
import { countWords, downloadUrl, htmlToPlainText } from "@/lib/utils";

interface EntryFormState {
  id?: string;
  time: string;
  title: string;
  content: string;
  mood: string | null;
  location: string;
  weather: string;
  highlights: string;
  status: "draft" | "published";
  tags: string[];
  images: EntryImageDTO[];
}

interface LocalDraft {
  savedAt: string;
  form: EntryFormState;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface SideTabDrag {
  pointerId: number;
  startX: number;
  startY: number;
  originY: number;
  height: number;
  moved: boolean;
}

const SIDE_TAB_POS_KEY = "kardiary:side-tab-pos:v1";
const SIDE_TAB_HEIGHT = 42;

function clampPosition(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function emptyForm(time = "12:00"): EntryFormState {
  return {
    time,
    title: "",
    content: "",
    mood: null,
    location: "",
    weather: "",
    highlights: "",
    status: "published",
    tags: [],
    images: [],
  };
}

function formFromEntry(entry: EntryDetail): EntryFormState {
  return {
    id: entry.id,
    time: entry.time,
    title: entry.title ?? "",
    content: entry.content ?? "",
    mood: entry.mood,
    location: entry.location ?? "",
    weather: entry.weather ?? "",
    highlights: entry.highlights ?? "",
    status: entry.status,
    tags: entry.tags.map((tag) => tag.name),
    images: entry.images,
  };
}

function hasMeaningfulForm(form: EntryFormState): boolean {
  return Boolean(
    form.title.trim() ||
      htmlToPlainText(form.content).trim() ||
      form.mood ||
      form.location.trim() ||
      form.weather.trim() ||
      form.highlights.trim() ||
      form.tags.length ||
      form.images.length,
  );
}

function defaultTimeFor(dateKey: string): string {
  return dateKey === todayKey() ? new Date().toTimeString().slice(0, 5) : "12:00";
}

function draftKey(dateKey: string, entryId: string | null): string {
  return localKeys.draft(`${dateKey}:${entryId ?? "new"}`);
}

function sameForm(a: EntryFormState, b: EntryFormState): boolean {
  if (
    a.time !== b.time ||
    a.title !== b.title ||
    a.content !== b.content ||
    a.mood !== b.mood ||
    a.location !== b.location ||
    a.weather !== b.weather ||
    a.highlights !== b.highlights ||
    a.status !== b.status ||
    a.tags.join("\u0001") !== b.tags.join("\u0001")
  ) {
    return false;
  }
  if (a.images.length !== b.images.length) return false;
  return a.images.every((image, index) => {
    const other = b.images[index];
    return image.id === other.id && image.caption === other.caption && image.sortOrder === other.sortOrder;
  });
}

function imageFigures(
  images: EntryImageDTO[],
  onOpen: (index: number) => void,
) {
  return images.map((image, index) => (
    <figure key={image.id} className="gallery-figure">
      <button
        type="button"
        className="entry-image block w-full"
        onClick={() => onOpen(index)}
        aria-label={image.caption || image.originalFilename}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.caption || image.originalFilename} loading="lazy" />
      </button>
      {image.caption ? <figcaption className="mt-1.5 px-1 text-xs text-[var(--muted)]">{image.caption}</figcaption> : null}
    </figure>
  ));
}

function EntryPageInner() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, locale, t } = useAppearance();
  const dateKey = typeof params.date === "string" ? params.date : "";
  const validDate = isValidDateKey(dateKey);
  const requestedId = searchParams.get("id");
  const requestedNew = searchParams.get("new") === "1";

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [dayEntries, setDayEntries] = useState<EntrySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMode, setNewMode] = useState(false);
  const [dayPage, setDayPage] = useState(0);
  const [sideOpen, setSideOpen] = useState(false);
  const [tabY, setTabY] = useState<number | null>(null);
  const [draggingTab, setDraggingTab] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EntryFormState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [allTags, setAllTags] = useState<TagDTO[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<LocalDraft | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [duplicatePending, setDuplicatePending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [memories, setMemories] = useState<EntrySummary[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [today, setToday] = useState<string | null>(null);

  const formRef = useRef<EntryFormState | null>(null);
  const versionRef = useRef(0);
  const mountedRef = useRef(true);
  const tabRef = useRef<HTMLButtonElement>(null);
  const tabDragRef = useRef<SideTabDrag | null>(null);
  const suppressTabClickRef = useRef(false);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    mountedRef.current = true;
    setToday(todayKey());
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(SIDE_TAB_POS_KEY);
    } catch {
      return;
    }
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<{ y: number }>;
      if (typeof parsed.y !== "number" || !Number.isFinite(parsed.y)) return;
      setTabY(clampPosition(parsed.y, 0, window.innerHeight - SIDE_TAB_HEIGHT));
    } catch {
      try {
        window.localStorage.removeItem(SIDE_TAB_POS_KEY);
      } catch {}
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      setTabY((current) => {
        if (current === null) return current;
        const height = tabRef.current?.offsetHeight ?? SIDE_TAB_HEIGHT;
        return clampPosition(current, 0, window.innerHeight - height);
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!validDate) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setEditing(false);
    setForm(null);
    setSaveState("idle");
    setDraftPrompt(null);
    setEntry(null);
    setSelectedId(null);
    setNewMode(false);
    setSideOpen(false);
    setDuplicateDate(shiftDateKey(dateKey, 1));

    async function load() {
      try {
        const result = await api.getEntriesByDate(dateKey);
        if (cancelled) return;
        setDayEntries(result.entries);
        setDayPage(0);

        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get("id");
        const urlNew = urlParams.get("new") === "1";

        if (urlNew) {
          setNewMode(true);
          setEditing(true);
          setForm(emptyForm(defaultTimeFor(dateKey)));
          setSaveState("idle");
          const draft = await idbGet<LocalDraft>(draftKey(dateKey, null));
          if (!cancelled && draft) setDraftPrompt(draft);
          if (!cancelled) setLoading(false);
          return;
        }

        const nextId =
          urlId && result.entries.some((item) => item.id === urlId)
            ? urlId
            : result.entries[0]?.id ?? null;

        if (!nextId) {
          setLoading(false);
          return;
        }

        setSelectedId(nextId);
        const detail = await api.getEntry(nextId);
        if (cancelled) return;
        setEntry(detail.entry);
        setLastSaved(new Date(detail.entry.updatedAt));
        const draft = await idbGet<LocalDraft>(draftKey(dateKey, detail.entry.id));
        if (cancelled || !draft) return;
        if (sameForm(draft.form, formFromEntry(detail.entry))) {
          void idbDelete(draftKey(dateKey, detail.entry.id));
        } else {
          setDraftPrompt(draft);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : t("error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    api
      .getMemories(dateKey)
      .then((result) => {
        if (!cancelled) setMemories(result.entries);
      })
      .catch(() => undefined);

    api
      .listTags()
      .then((result) => {
        if (!cancelled) setAllTags(result.tags);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [dateKey, validDate, refresh, t, requestedId, requestedNew]);

  useEffect(() => {
    if (!selectedId) return;
    const index = dayEntries.findIndex((item) => item.id === selectedId);
    if (index < 0) return;
    setDayPage(Math.floor(index / 3));
  }, [dayEntries, selectedId]);

  const startEditing = useCallback(() => {
    const next = entry ? formFromEntry(entry) : emptyForm(defaultTimeFor(dateKey));
    setForm(next);
    setEditing(true);
    setDraftPrompt(null);
    setDirty(false);
    versionRef.current = 0;
    setSaveState(entry ? "saved" : "idle");
    setLastSaved(entry ? new Date(entry.updatedAt) : null);
  }, [dateKey, entry]);

  const openEntry = useCallback(
    async (id: string) => {
      setSideOpen(false);
      if (!newMode && id === selectedId) return;
      setNewMode(false);
      setSelectedId(id);
      setEntry(null);
      setEditing(false);
      setForm(null);
      setDirty(false);
      setSaveState("idle");
      setDraftPrompt(null);
      setLoading(true);
      setLoadError(null);
      window.history.replaceState(null, "", `/entry/${dateKey}?id=${id}`);
      try {
        const detail = await api.getEntry(id);
        if (!mountedRef.current) return;
        setEntry(detail.entry);
        setLastSaved(new Date(detail.entry.updatedAt));
        const draft = await idbGet<LocalDraft>(draftKey(dateKey, id));
        if (!mountedRef.current || !draft) return;
        if (sameForm(draft.form, formFromEntry(detail.entry))) {
          void idbDelete(draftKey(dateKey, id));
        } else {
          setDraftPrompt(draft);
        }
      } catch (error) {
        if (mountedRef.current) setLoadError(error instanceof Error ? error.message : t("error"));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [dateKey, newMode, selectedId, t],
  );

  const startNewEntry = useCallback(() => {
    setSideOpen(false);
    setNewMode(true);
    setSelectedId(null);
    setEntry(null);
    setEditing(true);
    setForm(emptyForm(defaultTimeFor(dateKey)));
    setDirty(false);
    setSaveState("idle");
    setLastSaved(null);
    setDraftPrompt(null);
    versionRef.current = 0;
    window.history.replaceState(null, "", `/entry/${dateKey}?new=1`);
    void idbGet<LocalDraft>(draftKey(dateKey, null)).then((draft) => {
      if (mountedRef.current && draft) setDraftPrompt(draft);
    });
  }, [dateKey]);

  function startTabDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (sideOpen) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const originY = tabY ?? rect.top;
    if (tabY === null) setTabY(originY);
    tabDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originY,
      height: rect.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveTabDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = tabDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(deltaX, deltaY) < 6) return;
      drag.moved = true;
      setDraggingTab(true);
    }
    event.preventDefault();
    setTabY(clampPosition(drag.originY + deltaY, 0, window.innerHeight - drag.height));
  }

  function endTabDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = tabDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) {
      suppressTabClickRef.current = true;
      const top = tabRef.current?.getBoundingClientRect().top;
      if (typeof top === "number") {
        setTabY(top);
        try {
          window.localStorage.setItem(SIDE_TAB_POS_KEY, JSON.stringify({ y: top }));
        } catch {}
      }
      window.setTimeout(() => {
        suppressTabClickRef.current = false;
      }, 300);
    }
    setDraggingTab(false);
    tabDragRef.current = null;
  }

  function toggleSideMenu(event: ReactMouseEvent<HTMLButtonElement>) {
    if (suppressTabClickRef.current) {
      event.preventDefault();
      return;
    }
    setSideOpen((value) => !value);
  }

  const updateForm = useCallback((patch: Partial<EntryFormState>) => {
    setDirty(true);
    versionRef.current += 1;
    setSaveState("idle");
    setForm((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveForm = useCallback(
    async (manual: boolean): Promise<boolean> => {
      const current = formRef.current;
      if (!current) return false;
      if (!current.id && !hasMeaningfulForm(current)) {
        if (manual) toast.error(t("writeSomething"));
        return false;
      }
      const version = versionRef.current;
      setSaveState("saving");
      const payload = {
        time: current.time || "12:00",
        title: current.title.trim() || null,
        content: current.content,
        mood: current.mood,
        location: current.location.trim() || null,
        weather: current.weather.trim() || null,
        highlights: current.highlights.trim() || null,
        status: current.status,
        tags: current.tags,
        images: current.images.map((image, index) => ({
          id: image.id,
          caption: image.caption,
          sortOrder: index,
        })),
      };
      try {
        const result = current.id
          ? await api.updateEntry(current.id, payload)
          : await api.createEntry({ ...payload, dateKey });
        if (!mountedRef.current) return true;
        setEntry(result.entry);
        setSelectedId(result.entry.id);
        setDayEntries((existing) =>
          [...existing.filter((item) => item.id !== result.entry.id), result.entry].sort((a, b) =>
            b.time.localeCompare(a.time),
          ),
        );
        if (!current.id) {
          setNewMode(false);
          setForm((existing) => (existing ? { ...existing, id: result.entry.id } : existing));
          window.history.replaceState(null, "", `/entry/${dateKey}?id=${result.entry.id}`);
          void idbDelete(draftKey(dateKey, null));
        }
        if (version === versionRef.current) {
          setDirty(false);
          setSaveState("saved");
          setLastSaved(new Date(result.entry.updatedAt));
          void idbDelete(draftKey(dateKey, result.entry.id));
        } else {
          setSaveState("idle");
        }
        api
          .listTags()
          .then((tags) => {
            if (mountedRef.current) setAllTags(tags.tags);
          })
          .catch(() => undefined);
        return true;
      } catch (error) {
        if (!mountedRef.current) return false;
        setSaveState("error");
        toast.error(error instanceof Error ? error.message : t("saveFailed"));
        return false;
      }
    },
    [dateKey, t],
  );

  useEffect(() => {
    if (!editing || !form || !dirty) return;
    const draft: LocalDraft = { savedAt: new Date().toISOString(), form };
    void idbSet(draftKey(dateKey, form.id ?? null), draft);
    const timer = window.setTimeout(() => {
      void saveForm(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [form, editing, dirty, dateKey, saveForm]);

  async function finishEditing() {
    const current = formRef.current;
    if (!current) {
      setEditing(false);
      return;
    }
    if (!current.id && !hasMeaningfulForm(current)) {
      setEditing(false);
      setForm(null);
      void idbDelete(draftKey(dateKey, null));
      return;
    }
    const saved = await saveForm(true);
    if (!saved) return;
    setEditing(false);
    setForm(null);
    setDirty(false);
    void idbDelete(draftKey(dateKey, current.id ?? null));
  }

  function restoreDraft() {
    if (!draftPrompt) return;
    setForm(draftPrompt.form);
    setEditing(true);
    setDirty(true);
    versionRef.current += 1;
    setSaveState("idle");
    setDraftPrompt(null);
    toast.success(t("restoreDraft"));
  }

  function discardDraft() {
    void idbDelete(draftKey(dateKey, draftPrompt?.form.id ?? formRef.current?.id ?? null));
    setDraftPrompt(null);
  }

  async function handleFiles(files: FileList | File[]) {
    if (!form) return;
    const remaining = 30 - form.images.length;
    const selected = Array.from(files).slice(0, Math.max(0, remaining));
    if (selected.length === 0) return;
    setUploading(true);
    const uploaded: EntryImageDTO[] = [];
    try {
      for (const file of selected) {
        if (!file.type.startsWith("image/")) throw new Error(t("uploadError"));
        if (file.size > 10 * 1024 * 1024) throw new Error(t("supportedImages"));
        const result = await api.uploadImage(file, "entry");
        uploaded.push(result.image);
      }
      if (!mountedRef.current) return;
      setDirty(true);
      versionRef.current += 1;
      setSaveState("idle");
      setForm((current) =>
        current ? { ...current, images: [...current.images, ...uploaded] } : current,
      );
      toast.success(`${uploaded.length} ${t("photos")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadError"));
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  }

  function removeImage(id: string) {
    const current = formRef.current;
    if (!current) return;
    updateForm({ images: current.images.filter((image) => image.id !== id) });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const current = formRef.current;
    if (!current) return;
    const target = index + direction;
    if (target < 0 || target >= current.images.length) return;
    const images = [...current.images];
    const [item] = images.splice(index, 1);
    images.splice(target, 0, item);
    updateForm({ images: images.map((image, order) => ({ ...image, sortOrder: order })) });
  }

  function setCaption(id: string, caption: string) {
    const current = formRef.current;
    if (!current) return;
    updateForm({
      images: current.images.map((image) => (image.id === id ? { ...image, caption } : image)),
    });
  }

  async function confirmDelete() {
    if (!entry) return;
    setDeletePending(true);
    try {
      await api.deleteEntry(entry.id);
      await idbDelete(draftKey(dateKey, entry.id));
      toast.success(t("entryDeleted"));
      const remaining = dayEntries.filter((item) => item.id !== entry.id);
      router.push(
        remaining[0] ? `/entry/${dateKey}?id=${remaining[0].id}` : `/entry/${dateKey}?new=1`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setDeletePending(false);
    }
  }

  async function confirmDuplicate() {
    if (!entry || !duplicateDate) return;
    setDuplicatePending(true);
    try {
      const result = await api.duplicateEntry(entry.id, duplicateDate);
      toast.success(t("duplicateSuccess"));
      setDuplicateOpen(false);
      router.push(`/entry/${result.entry.dateKey}?id=${result.entry.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setDuplicatePending(false);
    }
  }

  if (!validDate) {
    return (
      <EmptyState
        title={t("error")}
        description={t("chooseDate")}
        action={
          <Link href="/" className="btn btn-primary">
            {t("openCalendar")}
          </Link>
        }
      />
    );
  }

  const prevDate = shiftDateKey(dateKey, -1);
  const nextDate = shiftDateKey(dateKey, 1);
  const mood = findMood(settings.moods, entry?.mood);
  const contentText = form ? htmlToPlainText(form.content) : "";
  const wordCount = form ? countWords(contentText) : entry?.wordCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(dayEntries.length / 3));
  const currentPage = Math.min(dayPage, pageCount - 1);
  const visibleDayEntries = dayEntries.slice(currentPage * 3, currentPage * 3 + 3);

  const dayCards =
    dayEntries.length > 1 ? (
      <section aria-label={t("entriesOnDay")}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-serif text-lg font-semibold">{t("entriesOnDay")}</h2>
          <span className="badge">{dayEntries.length}</span>
        </div>
        <div className="entry-card-list">
          {visibleDayEntries.map((item) => (
            <div
              key={item.id}
              className="entry-card-item"
              data-active={!newMode && selectedId === item.id}
            >
              <EntryCard entry={item} className="items-center" onSelect={() => void openEntry(item.id)} />
            </div>
          ))}
        </div>
        {pageCount > 1 ? (
          <div className="day-pager entry-card-pager">
            <button
              type="button"
              className="icon-btn h-7 w-7"
              onClick={() => setDayPage((value) => Math.max(0, value - 1))}
              disabled={currentPage === 0}
              aria-label={t("prevDay")}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              className="icon-btn h-7 w-7"
              onClick={() => setDayPage((value) => Math.min(pageCount - 1, value + 1))}
              disabled={currentPage >= pageCount - 1}
              aria-label={t("nextDay")}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}
      </section>
    ) : null;

  return (
    <div className="fade-up">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="icon-btn" aria-label={t("backToCalendar")}>
            <ArrowLeft size={17} />
          </Link>
          <div className="flex items-center gap-1">
            <Link href={`/entry/${prevDate}`} className="icon-btn" aria-label={t("prevDay")}>
              <ChevronLeft size={16} />
            </Link>
            <Link href={`/entry/${nextDate}`} className="icon-btn" aria-label={t("nextDay")}>
              <ChevronRight size={16} />
            </Link>
          </div>
          <Link href={`/entry/${today ?? dateKey}`} className="btn btn-secondary btn-sm">
            {t("today")}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <span className="hidden items-center gap-1.5 text-[0.72rem] text-[var(--muted)] sm:flex">
                {saveState === "saving" ? <Loader2 size={12} className="animate-spin" /> : null}
                {saveState === "saved" ? <Check size={13} className="text-[var(--primary)]" /> : null}
                {saveState === "saving"
                  ? t("saving")
                  : saveState === "saved" && lastSaved
                    ? `${t("savedAt")} ${formatDateTime(lastSaved, locale)}`
                    : saveState === "error"
                      ? t("saveFailed")
                      : dirty
                        ? t("unsavedShort")
                        : t("allSaved")}
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => void saveForm(true)}>
                <Save size={15} />
                {t("saveNow")}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void finishEditing()}>
                <Check size={16} />
                {t("finishEditing")}
              </button>
            </>
          ) : (
            <>
              {entry ? (
                <>
                  <button type="button" className="btn btn-secondary" onClick={startNewEntry}>
                    <Plus size={15} />
                    {t("newEntry")}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={startEditing}>
                    <Pencil size={15} />
                    {t("editEntry")}
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>

      {draftPrompt ? (
        <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] p-4">
          <div>
            <p className="text-sm font-semibold">{t("restoreDraft")}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDateTime(draftPrompt.savedAt, locale)}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={discardDraft}>
              {t("discard")}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={restoreDraft}>
              {t("restore")}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="card space-y-4 p-6">
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-48 w-full" />
          </div>
          <div className="card space-y-3 p-6">
            <div className="skeleton h-5 w-1/2" />
            <div className="skeleton h-24 w-full" />
          </div>
        </div>
      ) : loadError ? (
        <EmptyState
          title={t("error")}
          description={loadError}
          action={
            <button type="button" className="btn btn-primary" onClick={() => setRefresh((value) => value + 1)}>
              {t("retry")}
            </button>
          }
        />
      ) : editing && form ? (
        <div className="entry-page-grid">
          <div className="entry-editor-main min-w-0 space-y-4">
            <div className="card p-5 sm:p-6">
              <p className="eyebrow mb-3">{formatLongDate(dateKey, locale)}</p>
              <input
                value={form.title}
                onChange={(event) => updateForm({ title: event.target.value })}
                placeholder={t("titlePlaceholder")}
                className="w-full border-none bg-transparent font-serif text-2xl font-semibold leading-tight outline-none placeholder:text-[var(--muted)] sm:text-3xl"
                maxLength={200}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
                <label className="label mb-0" htmlFor="entry-time">
                  {t("time")}
                </label>
                <input
                  id="entry-time"
                  type="time"
                  value={form.time}
                  onChange={(event) => updateForm({ time: event.target.value })}
                  className="input h-9 w-32"
                  required
                />
                <span className="text-[0.7rem] text-[var(--muted)]">{t("timeHelp")}</span>
              </div>
            </div>

            <RichTextEditor
              content={form.content}
              onChange={(content) => updateForm({ content })}
              placeholder={t("bodyPlaceholder")}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
              <span>
                {wordCount} {t("words")} · {form.images.length} {t("photos")}
              </span>
              {entry ? (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={13} />
                  {t("deleteEntry")}
                </button>
              ) : null}
            </div>
          </div>

          <aside className={`entry-side min-w-0 space-y-4${sideOpen ? " is-open" : ""}`}>
            <section className="card space-y-4 p-5">
              <div>
                <span className="label">{t("publishStatus")}</span>
                <div className="pill-tabs">
                  <button
                    type="button"
                    data-active={form.status === "published"}
                    onClick={() => updateForm({ status: "published" })}
                  >
                    {t("published")}
                  </button>
                  <button
                    type="button"
                    data-active={form.status === "draft"}
                    onClick={() => updateForm({ status: "draft" })}
                  >
                    {t("draft")}
                  </button>
                </div>
              </div>

              <MoodPicker value={form.mood} onChange={(moodValue) => updateForm({ mood: moodValue })} />

              <div>
                <label className="label" htmlFor="highlights">
                  {t("highlights")}
                </label>
                <textarea
                  id="highlights"
                  value={form.highlights}
                  onChange={(event) => updateForm({ highlights: event.target.value })}
                  placeholder={t("highlightsPlaceholder")}
                  className="textarea"
                  maxLength={3000}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="label" htmlFor="location">
                    {t("location")}
                  </label>
                  <input
                    id="location"
                    value={form.location}
                    onChange={(event) => updateForm({ location: event.target.value })}
                    placeholder={t("locationPlaceholder")}
                    className="input"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="weather">
                    {t("weather")}
                  </label>
                  <input
                    id="weather"
                    value={form.weather}
                    onChange={(event) => updateForm({ weather: event.target.value })}
                    placeholder={t("weatherPlaceholder")}
                    className="input"
                    maxLength={120}
                  />
                </div>
              </div>

              <TagPicker
                value={form.tags}
                onChange={(tags) => updateForm({ tags })}
                allTags={allTags}
              />
            </section>

            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">{t("addImages")}</h2>
                <span className="text-xs text-[var(--muted)]">
                  {form.images.length}/30
                </span>
              </div>
              <label
                className="upload-zone block cursor-pointer"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleFiles(event.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files) void handleFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
                <span className="flex flex-col items-center gap-2 text-sm text-[var(--muted)]">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                  <span>{uploading ? t("processing") : t("dragDrop")}</span>
                  <span className="text-[0.68rem]">{t("supportedImages")}</span>
                  <span className="btn btn-secondary btn-sm mt-1">
                    <Upload size={13} />
                    {t("chooseFiles")}
                  </span>
                </span>
              </label>

              {form.images.length > 0 ? (
                <div className="mt-4 space-y-2.5">
                  {form.images.map((image, index) => (
                    <div key={image.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] p-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[6px]"
                          onClick={() => setLightboxIndex(index)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.url} alt={image.caption || ""} className="h-full w-full object-cover" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <input
                            value={image.caption ?? ""}
                            onChange={(event) => setCaption(image.id, event.target.value)}
                            placeholder={t("caption")}
                            className="input h-8 text-xs"
                            maxLength={300}
                          />
                          <div className="mt-1.5 flex items-center gap-1">
                            <button
                              type="button"
                              className="icon-btn h-7 w-7"
                              onClick={() => moveImage(index, -1)}
                              disabled={index === 0}
                              aria-label={t("moveLeft")}
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn h-7 w-7"
                              onClick={() => moveImage(index, 1)}
                              disabled={index === form.images.length - 1}
                              aria-label={t("moveRight")}
                            >
                              <ChevronRight size={13} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn h-7 w-7 text-[var(--danger)]"
                              onClick={() => removeImage(image.id)}
                              aria-label={t("removeImage")}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <button type="button" className="btn btn-secondary w-full" onClick={() => setExportOpen(true)} disabled={!entry}>
              <Download size={15} />
              {t("exportEntry")}
            </button>
          </aside>
        </div>
      ) : entry ? (
        <div className="entry-page-grid entry-page-grid-view">
          <div className="min-w-0 space-y-5">
            {dayCards}

            <article className="card overflow-hidden">
              <header className="border-b border-[var(--border)] p-5 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  <span className="eyebrow">{formatLongDate(dateKey, locale)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {entry.time}
                  </span>
                  {entry.status === "draft" ? <span className="badge">{t("draft")}</span> : null}
                  {mood ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5">
                      <span aria-hidden>{mood.emoji}</span>
                      {moodLabel(mood, locale)}
                    </span>
                  ) : null}
                  <span>
                    {wordCount} {t("words")}
                  </span>
                </div>
                <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                  {entry.title || formatLongDate(dateKey, locale)}
                </h1>
                {entry.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium"
                        style={{
                          backgroundColor: `${tag.color}1f`,
                          border: `1px solid ${tag.color}66`,
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>

              <div className="p-5 sm:p-8">
                {entry.highlights ? (
                  <div className="mb-6 rounded-[var(--radius-sm)] border-l-[3px] border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-4 py-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {t("highlights")}
                    </p>
                    <p className="mt-1 font-serif text-[1.02rem] italic">{entry.highlights}</p>
                  </div>
                ) : null}

                {entry.content && htmlToPlainText(entry.content) ? (
                  <div className="prose-diary" dangerouslySetInnerHTML={{ __html: entry.content }} />
                ) : (
                  <p className="text-sm italic text-[var(--muted)]">{t("entryEmptyBody")}</p>
                )}

                {entry.images.length > 0 ? (
                  <div className="mt-8 gallery-grid">{imageFigures(entry.images, setLightboxIndex)}</div>
                ) : null}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3 text-[0.68rem] text-[var(--muted)] sm:px-8">
                <span>
                  {t("updatedAt")}: {formatDateTime(entry.updatedAt, locale)}
                </span>
                <span>
                  {t("createdAt")}: {formatDateTime(entry.createdAt, locale)}
                </span>
              </footer>
            </article>

            {memories.length > 0 ? (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-semibold">{t("onThisDay")}</h2>
                  <Link href="/memories" className="text-xs font-semibold text-[var(--primary)]">
                    {t("allMemories")}
                  </Link>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {memories.slice(0, 4).map((memory) => (
                    <EntryCard key={memory.id} entry={memory} showYear />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className={`entry-side min-w-0 space-y-4${sideOpen ? " is-open" : ""}`}>
            <section className="card p-5">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-[var(--radius-sm)] bg-[var(--selected)] text-[var(--selected-contrast)]">
                  <span className="font-serif text-xl font-semibold leading-none">{dayOfDateKey(dateKey)}</span>
                  <span className="mt-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.08em]">
                    {formatMonthLong(monthOfDateKey(dateKey) - 1, locale).slice(0, 3)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">{entry.dateKey.slice(0, 4)}</p>
                  <p className="font-serif text-base font-semibold">{formatLongDate(dateKey, locale)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={15} className="flex-shrink-0 text-[var(--muted)]" />
                  <span>{entry.time}</span>
                </div>
                {entry.location ? (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={15} className="mt-0.5 flex-shrink-0 text-[var(--muted)]" />
                    <span>{entry.location}</span>
                  </div>
                ) : null}
                {entry.weather ? (
                  <div className="flex items-start gap-2 text-sm">
                    <CloudSun size={15} className="mt-0.5 flex-shrink-0 text-[var(--muted)]" />
                    <span>{entry.weather}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={15} className="flex-shrink-0 text-[var(--muted)]" />
                  <span>
                    {entry.wordCount} {t("words")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Camera size={15} className="flex-shrink-0 text-[var(--muted)]" />
                  <span>
                    {entry.images.length} {t("photos")}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-secondary" onClick={startNewEntry}>
                    <Plus size={15} />
                    {t("newEntry")}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={startEditing}>
                    <Pencil size={15} />
                    {t("editEntry")}
                  </button>
                </div>
                <button type="button" className="btn btn-secondary w-full" onClick={() => setDuplicateOpen(true)}>
                  <Copy size={15} />
                  {t("duplicateEntry")}
                </button>
                <button type="button" className="btn btn-secondary w-full" onClick={() => setExportOpen(true)}>
                  <Download size={15} />
                  {t("exportEntry")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger w-full"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={15} />
                  {t("deleteEntry")}
                </button>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-2 font-serif text-base font-semibold">{t("onThisDayShort")}</h2>
              {memories.length > 0 ? (
                <div className="space-y-2">
                  {memories.slice(0, 3).map((memory) => (
                    <EntryCard key={memory.id} entry={memory} className="items-center p-2.5" showYear />
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--muted)]">{t("noEntryOnThisDay")}</p>
              )}
            </section>
          </aside>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card px-5 py-5 sm:px-8">
            <p className="eyebrow">{formatLongDate(dateKey, locale)}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">{formatLongDate(dateKey, locale)}</h1>
          </div>
          <EmptyState
            title={t("entryEmptyTitle")}
            description={t("entryEmptyBody")}
            action={
              <button type="button" className="btn btn-primary btn-lg" onClick={startNewEntry}>
                <Pencil size={16} />
                {t("createEntry")}
              </button>
            }
          />
          {memories.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold">{t("onThisDay")}</h2>
                <Link href="/memories" className="text-xs font-semibold text-[var(--primary)]">
                  {t("allMemories")}
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {memories.map((memory) => (
                  <EntryCard key={memory.id} entry={memory} showYear />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {entry || (editing && form) ? (
        <>
          <button
            type="button"
            className={`side-backdrop${sideOpen ? " is-open" : ""}`}
            aria-label={t("close")}
            onClick={() => setSideOpen(false)}
          />
          <button
            ref={tabRef}
            type="button"
            className={`side-menu-tab${sideOpen ? " is-open" : ""}${tabY !== null ? " is-custom" : ""}${draggingTab ? " is-dragging" : ""}`}
            style={tabY !== null ? { top: tabY, transform: "none" } : undefined}
            aria-label={sideOpen ? t("close") : t("entryMenu")}
            aria-expanded={sideOpen}
            onClick={toggleSideMenu}
            onPointerDown={startTabDrag}
            onPointerMove={moveTabDrag}
            onPointerUp={endTabDrag}
            onPointerCancel={endTabDrag}
          >
            <span className="side-menu-icon" aria-hidden>
              <PenLine size={18} className="side-menu-pen" />
              <X size={18} className="side-menu-x" />
            </span>
          </button>
        </>
      ) : null}

      <ImageLightbox
        images={editing && form ? form.images : entry?.images ?? []}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent title={t("duplicateEntry")} description={t("duplicateTo")}>
          <input
            type="date"
            value={duplicateDate}
            onChange={(event) => setDuplicateDate(event.target.value)}
            className="input"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDuplicateOpen(false)}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void confirmDuplicate()}
              disabled={duplicatePending || !duplicateDate}
            >
              {duplicatePending ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              {t("confirm")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent title={t("exportEntry")} description={t("exportEntryHelp")}>
          <div className="grid gap-2">
            {entry ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary justify-start"
                  onClick={() => downloadUrl(`/api/entries/${entry.id}/export?format=json`, `${dateKey}.json`)}
                >
                  <Download size={15} />
                  {t("exportJson")}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary justify-start"
                  onClick={() => downloadUrl(`/api/entries/${entry.id}/export?format=md`, `${dateKey}.md`)}
                >
                  <FileText size={15} />
                  {t("exportMarkdown")}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary justify-start"
                  onClick={() => downloadUrl(`/api/entries/${entry.id}/export?format=html`, `${dateKey}.html`)}
                >
                  <Download size={15} />
                  {t("exportHtml")}
                </button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmBody")}
        confirmLabel={t("deleteEntry")}
        cancelLabel={t("cancel")}
        danger
        pending={deletePending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function EntryFallback() {
  return (
    <div className="fade-up">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="skeleton h-9 w-44 rounded-full" />
        <div className="skeleton h-9 w-28 rounded-full" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card space-y-4 p-6">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-9 w-2/3" />
          <div className="skeleton h-48 w-full" />
        </div>
        <div className="card space-y-3 p-6">
          <div className="skeleton h-5 w-1/2" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function EntryPage() {
  return (
    <Suspense fallback={<EntryFallback />}>
      <EntryPageInner />
    </Suspense>
  );
}
