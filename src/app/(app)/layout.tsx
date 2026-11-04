import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppearanceProvider } from "@/components/app/appearance-provider";
import { AppToaster } from "@/components/app/toaster";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <AppShell>{children}</AppShell>
      <AppToaster />
    </AppearanceProvider>
  );
}
