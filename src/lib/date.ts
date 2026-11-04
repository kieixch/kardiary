import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import type { Locale } from "@/lib/appearance";

export const DATE_KEY_FORMAT = "yyyy-MM-dd";

export function dateFnsLocale(locale: Locale) {
  return locale === "id" ? idLocale : enUS;
}

export function toDateKey(date: Date): string {
  return format(date, DATE_KEY_FORMAT);
}

export function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const date = parse(dateKey, DATE_KEY_FORMAT, new Date());
  if (!isValid(date)) return null;
  return toDateKey(date) === dateKey ? date : null;
}

export function isValidDateKey(dateKey: string): boolean {
  return parseDateKey(dateKey) !== null;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function currentMonthStart(): Date {
  return startOfMonth(new Date());
}

export function parseMonthKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const date = parse(`${value}-01`, DATE_KEY_FORMAT, new Date());
  if (!isValid(date)) return null;
  return startOfMonth(date);
}

export function addMonth(date: Date, amount: number): Date {
  return startOfMonth(addMonths(date, amount));
}

export function shiftDateKey(dateKey: string, amount: number): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return toDateKey(addDays(date, amount));
}

export function calendarDays(month: Date, firstDayOfWeek: 0 | 1): Date[] {
  const weekStartsOn = firstDayOfWeek === 0 ? 0 : 1;
  const start = startOfWeek(startOfMonth(month), { weekStartsOn });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn });
  return eachDayOfInterval({ start, end });
}

export function weekdayLabels(locale: Locale, firstDayOfWeek: 0 | 1): string[] {
  const weekStartsOn = firstDayOfWeek === 0 ? 0 : 1;
  const start = startOfWeek(new Date(2024, 0, 7), { weekStartsOn });
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(start, index), "EEEEEE", { locale: dateFnsLocale(locale) }),
  );
}

export function formatLongDate(dateKey: string, locale: Locale): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return format(date, "EEEE, d MMMM yyyy", { locale: dateFnsLocale(locale) });
}

export function formatMediumDate(dateKey: string, locale: Locale): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return format(date, "d MMMM yyyy", { locale: dateFnsLocale(locale) });
}

export function formatMonthYear(date: Date, locale: Locale): string {
  return format(date, "LLLL yyyy", { locale: dateFnsLocale(locale) });
}

export function formatMonthShort(monthIndex: number, locale: Locale): string {
  return format(new Date(2024, monthIndex, 1), "LLL", { locale: dateFnsLocale(locale) });
}

export function formatMonthLong(monthIndex: number, locale: Locale): string {
  return format(new Date(2024, monthIndex, 1), "LLLL", { locale: dateFnsLocale(locale) });
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!isValid(date)) return "";
  return format(date, "d MMM yyyy, HH:mm", { locale: dateFnsLocale(locale) });
}

export function yearOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

export function monthOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(5, 7));
}

export function dayOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

export function sameMonthDay(dateKey: string, reference: string): boolean {
  return dateKey.slice(5) === reference.slice(5) && dateKey !== reference;
}
