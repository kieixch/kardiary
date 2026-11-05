import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/app/pwa-register";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";

export const metadata: Metadata = {
  title: "KARDIARY — Diari pribadi",
  description:
    "Diari pribadi berbasis kalender dengan tampilan yang bisa disesuaikan, pencarian, statistik, kenangan, dan ekspor cadangan.",
  applicationName: "KARDIARY",
  appleWebApp: {
    capable: true,
    title: "KARDIARY",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#F4EFE6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
