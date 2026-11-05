"use client";

import { useState } from "react";
import { ArrowRight, Feather, Loader2, LockKeyhole } from "lucide-react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Kata sandi tidak dapat diverifikasi.");
      }
      window.location.assign(nextPath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal masuk.");
      setPending(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <span className="brand-mark">
            <Feather size={19} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-[0.84rem] font-semibold leading-tight tracking-[0.16em]">
              KARDIARY
            </span>
            <span className="block text-[0.66rem] text-[var(--muted)]">
              Diari pribadi, seluas ingatanmu.
            </span>
          </span>
        </div>

        <div className="mt-9">
          <h1 className="font-serif text-[2rem] leading-tight">Selamat datang kembali</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Masukkan kata sandi untuk membuka diari.
          </p>
        </div>

        <form className="card mt-6 space-y-4 p-5" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="password">
              Kata sandi
            </label>
            <div className="relative">
              <LockKeyhole
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input input-with-icon"
                placeholder="Kata sandi KARDIARY"
                disabled={pending}
              />
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--card))] px-3 py-2 text-xs"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary w-full justify-center"
            disabled={pending || password.length === 0}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            {pending ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <p className="mt-4 text-center text-[0.68rem] text-[var(--muted)]">
          Sesi tersimpan selama 30 hari di perangkat ini.
        </p>
      </div>
    </main>
  );
}
