export type EntryStatus = "draft" | "published";

export interface TagDTO {
  id: string;
  name: string;
  color: string;
  count?: number;
}

export interface EntryImageDTO {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  mimeType: string;
  fileSize: number;
  originalFilename: string;
  createdAt: string;
}

export interface EntrySummary {
  id: string;
  dateKey: string;
  time: string;
  title: string | null;
  excerpt: string;
  wordCount: number;
  mood: string | null;
  status: EntryStatus;
  location: string | null;
  weather: string | null;
  highlights: string | null;
  createdAt: string;
  updatedAt: string;
  images: EntryImageDTO[];
  tags: TagDTO[];
}

export interface EntryDetail extends EntrySummary {
  content: string;
  contentText: string;
}

export interface MonthEntriesResponse {
  month: string;
  entries: EntrySummary[];
}

export interface MemoriesResponse {
  date: string;
  entries: EntrySummary[];
}

export interface DashboardStats {
  totalEntries: number;
  drafts: number;
  photoCount: number;
  totalWords: number;
  currentStreak: number;
  longestStreak: number;
  thisMonthEntries: number;
  topMood: string | null;
}

export interface MonthCount {
  key: string;
  month: number;
  count: number;
}

export interface FullStats extends DashboardStats {
  entriesByMonth: MonthCount[];
  moodDistribution: { mood: string; count: number }[];
  topTags: TagDTO[];
  firstEntryDate: string | null;
  lastEntryDate: string | null;
}

export interface BackupImage extends EntryImageDTO {
  dataBase64?: string;
}

export interface BackupEntry extends Omit<EntryDetail, "images"> {
  images: BackupImage[];
}

export interface BackupPayload {
  app: "kardiary";
  version: number;
  exportedAt: string;
  entries: BackupEntry[];
  tags: TagDTO[];
  settings?: unknown;
}

export interface ImportResult {
  detected: number;
  imported: number;
  skipped: number;
  overwritten: number;
  images: number;
  duplicates: string[];
  valid: boolean;
  errors?: string[];
}
