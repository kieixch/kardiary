import Link from "next/link";
import { Feather, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="login-shell">
      <div className="card w-full max-w-sm p-8 text-center">
        <span className="brand-mark mx-auto">
          <Feather size={19} strokeWidth={1.8} />
        </span>
        <div className="mt-5 inline-flex items-center gap-1.5 text-[var(--muted)]">
          <WifiOff size={15} />
          <span className="eyebrow">Offline</span>
        </div>
        <h1 className="mt-2 font-serif text-2xl font-semibold">Kamu sedang offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Koneksi internet diperlukan untuk membuka KARDIARY dan menyinkronkan catatanmu.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Coba lagi
        </Link>
      </div>
    </div>
  );
}
