"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Feather,
  LogOut,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";

interface NavItem {
  href: string;
  labelKey:
    | "navCalendar"
    | "navSearch"
    | "navMemories"
    | "navStats"
    | "navAppearance";
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "navCalendar", icon: CalendarDays },
  { href: "/search", labelKey: "navSearch", icon: Search },
  { href: "/memories", labelKey: "navMemories", icon: Sparkles },
  { href: "/stats", labelKey: "navStats", icon: BarChart3 },
  { href: "/settings", labelKey: "navAppearance", icon: Palette },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  variant,
  pathname,
}: {
  variant: "sidebar" | "top" | "bottom";
  pathname?: string;
}) {
  const { t } = useAppearance();
  const className =
    variant === "sidebar"
      ? "mt-8 flex flex-col gap-1"
      : variant === "top"
        ? "flex items-center gap-1"
        : "mobile-bottomnav";
  const iconSize = variant === "sidebar" ? 18 : variant === "top" ? 16 : 19;

  return (
    <nav className={className} aria-label={t("menu")}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={variant === "sidebar" ? "nav-link" : variant === "top" ? "nav-link py-2" : undefined}
            data-active={pathname ? isActive(pathname, item.href) : undefined}
          >
            <Icon size={iconSize} strokeWidth={1.8} className="nav-icon" />
            {variant === "bottom" ? <span>{t(item.labelKey)}</span> : t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveNav({ variant }: { variant: "sidebar" | "top" | "bottom" }) {
  const pathname = usePathname();
  return <NavList variant={variant} pathname={pathname} />;
}

function Brand() {
  const { t } = useAppearance();
  return (
    <Link href="/" className="flex items-center gap-3 min-w-0">
      <span className="brand-mark">
        <Feather size={19} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold tracking-[0.16em] text-[0.84rem] leading-tight">
          {t("appName")}
        </span>
        <span className="block text-[0.66rem] text-[var(--muted)] truncate">{t("tagline")}</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settings, t } = useAppearance();
  const router = useRouter();
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="app-shell" data-nav={settings.layout.nav}>
      <div className="app-background" aria-hidden />
      <div className="app-overlay" aria-hidden />

      <aside className="app-sidebar">
        <Brand />
        <Suspense fallback={<NavList variant="sidebar" />}>
          <ActiveNav variant="sidebar" />
        </Suspense>
        <div className="mt-auto space-y-3 pt-8">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-3">
            <div className="flex items-center gap-2 text-[0.72rem] font-semibold text-[var(--primary)]">
              <ShieldCheck size={14} />
              {t("localPrivate")}
            </div>
            <p className="mt-1 text-[0.66rem] leading-relaxed text-[var(--muted)]">{t("sampleHint")}</p>
          </div>
          <button type="button" className="nav-link w-full" onClick={() => void logout()}>
            <LogOut size={15} strokeWidth={1.8} className="nav-icon" />
            {t("logout")}
          </button>
          <p className="px-1 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted)]">
            {year ? `KARDIARY · ${year}` : "KARDIARY"}
          </p>
        </div>
      </aside>

      <header className="app-topnav">
        <div className="mx-auto flex max-w-[var(--page-width)] items-center justify-between gap-6 px-8 py-3">
          <Brand />
          <Suspense fallback={<NavList variant="top" />}>
            <ActiveNav variant="top" />
          </Suspense>
        </div>
      </header>

      <div className="app-mobilebar">
        <Brand />
        <div className="flex items-center gap-1">
          <Link href="/settings" className="icon-btn" aria-label={t("navAppearance")}>
            <Palette size={17} />
          </Link>
          <button type="button" className="icon-btn" aria-label={t("logout")} onClick={() => void logout()}>
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="main-wrap">{children}</div>
      </div>

      <Suspense fallback={<NavList variant="bottom" />}>
        <ActiveNav variant="bottom" />
      </Suspense>
    </div>
  );
}
