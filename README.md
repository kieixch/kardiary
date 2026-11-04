# KARDIARY

Diari pribadi berbasis kalender. KARDIARY bisa dijalankan lokal dengan SQLite atau dideploy ke Vercel dengan Neon Postgres dan Cloudflare R2. Akses aplikasi dilindungi kata sandi.

## Fitur

- Kalender bulanan dan tahunan dengan penanda entri, mood, dan thumbnail.
- Beberapa entri per tanggal, lengkap dengan judul, isi rich text, mood, tag, lokasi, cuaca, dan highlight.
- Editor TipTap dengan autosave, draft lokal, dan riwayat mood/tag.
- Unggah beberapa foto per entri, caption, urutan, lightbox, dan gambar latar.
- Pencarian dan filter berdasarkan teks, bulan, tahun, mood, tag, status, serta ada/tidaknya foto.
- Statistik: total entri, streak, kata, foto, distribusi mood, dan tag teratas.
- Halaman kenangan untuk entri lama dan entri terbaru.
- Tema terang/gelap, preset warna, kalender, tipografi, dan tata letak yang dapat dikustomisasi.
- Bahasa Indonesia dan Inggris.
- Ekspor JSON lengkap (termasuk foto dan pengaturan), Markdown, serta HTML siap cetak.
- Impor JSON dengan validasi, dry-run, lewati/duplikat, dan opsi memulihkan pengaturan.

## Persyaratan

- Node.js 20.9 atau lebih baru.
- npm.
- Neon Postgres dan Cloudflare R2 untuk deployment Vercel.

## Menjalankan lokal (SQLite)

Jalankan dari Command Prompt di folder proyek:

```bat
cd E:\code\kardiary
npm install
npm run db:local:push
npm run dev
```

Buka `http://localhost:3000`.

Catatan:

- `npm run dev` memakai `prisma/schema.sqlite.prisma` dan `LOCAL_DATABASE_URL`.
- Database lokal default ada di `data/kardiary.db`; foto ada di `data/uploads/`.
- Jika `KARDIARY_PASSWORD` tidak diisi saat development, login dilewati.
- `npm run db:local:push` hanya diperlukan saat schema SQLite berubah.

## Deploy ke Vercel

### 1. Siapkan Neon Postgres

1. Buat project Neon.
2. Salin connection string pooled dan unpooled.
3. Simpan sebagai `DATABASE_URL` (pooled) dan `DIRECT_URL` (unpooled).

Contoh:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require"
```

### 2. Siapkan Cloudflare R2

1. Buat bucket R2.
2. Buat API token dengan izin Object Read & Write untuk bucket tersebut.
3. Catat account ID 32 karakter (bukan URL dashboard), access key ID, secret access key, dan nama bucket.
4. Bucket tidak perlu dibuka ke publik; gambar disajikan lewat API KARDIARY yang sudah diproteksi login.

Environment yang dibutuhkan:

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
```

`R2_ENDPOINT` opsional jika memakai endpoint S3-compatible lain.

### 3. Siapkan password

```env
KARDIARY_PASSWORD="kata-sandi-yang-kuat"
KARDIARY_SESSION_SECRET="nilai-acak-panjang"
```

Buat secret dengan:

```bat
openssl rand -base64 32
```

Atau gunakan password manager untuk menghasilkan nilai acak minimal 32 karakter.

### 4. Hubungkan repository

```bat
git init
git add .
git commit -m "Prepare KARDIARY for Vercel deployment"
git remote add origin https://github.com/kieixch/kardiary.git
git push -u origin main
```

### 5. Deploy di Vercel

1. Import repository `kieixch/kardiary` ke Vercel.
2. Tambahkan semua environment di atas untuk Production, Preview, dan Development.
3. Deploy. `vercel.json` menjalankan `prisma migrate deploy` sebelum `next build`.
4. Buka URL deployment dan masuk dengan `KARDIARY_PASSWORD`.

Tidak ada migrasi data otomatis dari SQLite lokal. Jika ingin memindahkan isi diari, gunakan **Pengaturan -> Data -> Ekspor JSON** dari versi lokal, lalu impor lewat aplikasi yang sudah dideploy.

## Environment

| Variabel | Fungsi |
| --- | --- |
| `DATABASE_URL` | Connection string Neon pooled untuk aplikasi. |
| `DIRECT_URL` | Connection string Neon unpooled untuk migrasi Prisma. |
| `LOCAL_DATABASE_URL` | Database SQLite untuk `npm run dev`. |
| `KARDIARY_PASSWORD` | Kata sandi untuk membuka aplikasi. |
| `KARDIARY_SESSION_SECRET` | Secret untuk menandatangani cookie sesi. |
| `R2_ACCOUNT_ID` | Cloudflare account ID. |
| `R2_ACCESS_KEY_ID` | Access key R2. |
| `R2_SECRET_ACCESS_KEY` | Secret key R2. |
| `R2_BUCKET` | Nama bucket R2. |
| `R2_ENDPOINT` | Opsional, override endpoint S3-compatible. |
| `KARDIARY_UPLOAD_DIR` | Opsional, folder upload lokal saat development. |

## Lokasi data

| Data | Lokal | Production |
| --- | --- | --- |
| Entri, tag, pengaturan | `data/kardiary.db` | Neon Postgres |
| Foto | `data/uploads/<YYYY-MM>/` | Cloudflare R2 |
| Konfigurasi | `.env` | Environment Vercel |
| Migrasi | `prisma/schema.sqlite.prisma` | `prisma/migrations/` |

## Backup dan restore

### Lewat aplikasi

Buka **Pengaturan -> Data -> Ekspor JSON**. File JSON berisi entri, tag, pengaturan, dan foto dalam bentuk base64. File ini dapat diimpor kembali melalui **Pengaturan -> Data -> Impor**.

Ekspor Markdown dan HTML berguna untuk dibaca atau dicetak, tetapi tidak dapat diimpor kembali.

### Level database lokal

1. Hentikan aplikasi.
2. Salin `data/kardiary.db`.
3. Salin seluruh folder `data/uploads`.

Untuk restore lokal, hentikan aplikasi, ganti file/folder tersebut, lalu jalankan `npm run dev`.

## Perintah npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Generate Prisma SQLite lalu jalankan server pengembangan. |
| `npm run build` | Generate Prisma Postgres lalu membuat build produksi. |
| `npm run start` | Menjalankan hasil build. |
| `npm run lint` | Menjalankan ESLint. |
| `npm run typecheck` | Memeriksa tipe TypeScript. |
| `npm run db:migrate` | Membuat dan menerapkan migrasi Postgres. |
| `npm run db:push` | Menyinkronkan schema Postgres tanpa file migrasi. |
| `npm run db:studio` | Membuka Prisma Studio untuk Postgres. |
| `npm run db:local:push` | Menyinkronkan schema SQLite lokal. |
| `npm run db:local:studio` | Membuka Prisma Studio untuk SQLite lokal. |

## Struktur singkat

```text
src/app/                    Halaman App Router dan API routes
src/app/(app)/              Halaman utama yang memakai AppShell
src/app/login/              Halaman login
src/components/             Komponen UI, kalender, editor, dialog
src/lib/                    Database, auth, storage, validasi, ekspor, i18n
prisma/schema.prisma        Schema Postgres untuk production
prisma/schema.sqlite.prisma Schema SQLite untuk development
prisma/migrations/          Migrasi Postgres
data/                       Database dan unggahan lokal
vercel.json                 Build command dan migrasi saat deploy
```

## Keamanan dan privasi

- Semua halaman dan API dilindungi kata sandi melalui `src/proxy.ts` dan cookie HttpOnly bertanda tangan.
- `KARDIARY_PASSWORD` dan `KARDIARY_SESSION_SECRET` wajib diisi di Vercel.
- Foto R2 bersifat privat dan hanya disajikan melalui `/api/images/[id]` setelah login.
- File backup berisi teks dan foto asli tanpa enkripsi. Simpan di tempat aman.
- Aplikasi tidak memiliki multi-user, enkripsi tambahan, atau telemetry.

## Pemecahan masalah

**Port sudah dipakai**

```bat
npm run dev -- -p 3005
npm run start -- -p 3005 -H 127.0.0.1
```

Periksa proses di Windows:

```bat
netstat -ano | findstr :3000
```

**Database atau Prisma error**

```bat
npx prisma generate
npx prisma migrate deploy
```

**Foto gagal diunggah di Vercel**

Pastikan `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan `R2_BUCKET` sudah diisi, API token memiliki izin Object Read & Write, dan nama bucket benar. Gunakan account ID 32 karakter, bukan URL dashboard. Foto besar dikompres otomatis di browser agar aman terhadap batas body Vercel; ukuran maksimal 10 MB dengan format JPEG, PNG, WEBP, atau GIF.

**Login berulang atau cookie tidak tersimpan**

Pastikan `KARDIARY_PASSWORD` dan `KARDIARY_SESSION_SECRET` diisi di environment Vercel, lalu redeploy.

## Batasan

- Satu pengguna per instalasi.
- Tidak ada sinkronisasi antarperangkat selain lewat backup/restore.
- Tidak ada enkripsi bawaan.
- Deployment Vercel membutuhkan Neon Postgres dan Cloudflare R2.
