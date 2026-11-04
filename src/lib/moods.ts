export interface MoodOption {
  id: string;
  label: string;
  labelEn: string;
  emoji: string;
  color: string;
  enabled: boolean;
}

export const DEFAULT_MOODS: MoodOption[] = [
  { id: "happy", label: "Bahagia", labelEn: "Happy", emoji: "😊", color: "#E8B84B", enabled: true },
  { id: "calm", label: "Tenang", labelEn: "Calm", emoji: "🌿", color: "#8FAE86", enabled: true },
  { id: "excited", label: "Bersemangat", labelEn: "Excited", emoji: "✨", color: "#E58F65", enabled: true },
  { id: "grateful", label: "Bersyukur", labelEn: "Grateful", emoji: "🙏", color: "#C9A227", enabled: true },
  { id: "sad", label: "Sedih", labelEn: "Sad", emoji: "🌧️", color: "#7C93B8", enabled: true },
  { id: "anxious", label: "Cemas", labelEn: "Anxious", emoji: "🌪️", color: "#9B8AA6", enabled: true },
  { id: "tired", label: "Lelah", labelEn: "Tired", emoji: "🌙", color: "#8B8B8B", enabled: true },
  { id: "angry", label: "Marah", labelEn: "Angry", emoji: "🔥", color: "#C25B4E", enabled: true },
  { id: "loved", label: "Dicintai", labelEn: "Loved", emoji: "💗", color: "#D98A9E", enabled: true },
  { id: "neutral", label: "Biasa saja", labelEn: "Neutral", emoji: "☁️", color: "#A7A399", enabled: true },
];

export function findMood(moods: MoodOption[], id: string | null | undefined): MoodOption | undefined {
  if (!id) return undefined;
  return moods.find((mood) => mood.id === id) ?? DEFAULT_MOODS.find((mood) => mood.id === id);
}

export function moodLabel(mood: MoodOption | undefined, locale: "id" | "en"): string {
  if (!mood) return "";
  return locale === "id" ? mood.label : mood.labelEn;
}
