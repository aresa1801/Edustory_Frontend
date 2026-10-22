# EduStory — Audit Flow & Kesiapan Production

**Tanggal:** 17 Oktober 2026
**Repo:** `aresa1801/Edustory_Frontend` (commit `136f81d`)
**Deploy:** Vercel project `v0-edu-story-website-design` → `v0-edustory.vercel.app`
**Build:** ✅ `next build` sukses (Next.js 14.2.35) — 0 error

---

## 1. Ringkasan Eksekutif

| Aspek | Status |
| --- | --- |
| Build & type-check | ✅ Lulus |
| Deploy | ✅ READY (16 Okt 2026 13:01) |
| Struktur & modularitas | ✅ Baik (54.845 LOC, 50+ halaman, 75 API route) |
| Pembayaran (Midtrans) | ✅ Signature webhook diverifikasi |
| Auth (Supabase SSR) | ⚠️ Ada, tapi **tidak dipakai di banyak API** |
| Keamanan API | 🔴 **Blocker** — IDOR pada ±29 endpoint |
| SEO / Promosi | 🟠 Belum ada sitemap, robots, OG image |
| Domain | 🟠 Masih `*.vercel.app` (belum ada domain brand) |
| Testing / CI | 🔴 Tidak ada test otomatis & CI |

### Verdict
**BELUM siap untuk promosi publik / production final.**
Sistem sudah **layak demo & closed beta**, tetapi ada **3 blocker keamanan** yang wajib dibereskan
sebelum trafik promosi masuk. Estimasi perbaikan blocker: **1–2 hari kerja**.

Skor kesiapan: **6/10**

---

## 2. Isi Project

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind v4 · Supabase (Auth + DB) · Midtrans · DeepSeek AI · Vercel

| Area | Jumlah |
| --- | --- |
| Halaman (`page.tsx`) | 50 |
| API route | 75 |
| Komponen | 30+ folder/berkas |
| Total LOC (app+components+lib) | ±54.845 |
| Env vars di Vercel | 31 |

**Modul utama**
- Publik: landing, blog (3 artikel), login/register, maintenance, offline
- Siswa: onboarding, cari pengajar, my tutors, jadwal, progress, analytics, wallet, tutor offers, pembayaran
- Pengajar: profil, teaching interest, student offers, jadwal, my students, analytics, wallet, **kurasi** (tes akademik, psikologi, interview AI, microteaching, handwriting)
- Admin: dashboard, tutors, students, programs, payments, withdrawals, settings, analytics
- API: auth, matches, sessions, schedules, files/folders, wallet, payouts, withdraw, credit, AI (interview/assessment), midtrans, cron

**Dokumentasi:** `AUTH_FLOW_DOCUMENTATION.md`, `DESIGN.md`, `README.md`, folder `docs/`, `db/`, `scripts/`

---

## 3. Audit Flow

### 3.1 Auth ✅ (desain baik)
- Supabase SSR + `middleware.ts` refresh session, maintenance mode, proteksi `/dashboard`.
- Role disimpan di `user_profiles`; halaman dashboard dilindungi **client-side** (`allowedRoles`).
- Callback OAuth → set role → redirect sesuai peran. Terdokumentasi lengkap.
- ⚠️ Middleware **tidak** membedakan role di level server (admin/student/tutor).

### 3.2 Siswa
Homepage → daftar/login → onboarding → cari pengajar → kirim offer → match → jadwal → sesi (ready/complete/cancel) → wallet & pembayaran. Alur lengkap dan konsisten.

### 3.3 Pengajar
Daftar → teaching interest → kurasi 5 tahap (akademik, psikologi, interview AI, microteaching, handwriting) → lolos → terima siswa → jadwal → sesi → saldo → withdraw.

### 3.4 Pembayaran ✅
Midtrans charge + webhook dengan verifikasi `SHA512(order_id+status_code+gross_amount+serverKey)` — benar. Ada payout & withdrawal.

### 3.5 Cron ✅
`auto-complete-sessions` & `expire-hanging-sessions` dilindungi `Bearer CRON_SECRET`.

---

## 4. Temuan (severity)

### 🔴 BLOCKER 1 — IDOR: ±29 API route memakai service role tanpa verifikasi user
Pola: route membaca `user_id` / `student_id` / `role` **dari query string**, lalu query memakai
`SUPABASE_SERVICE_ROLE_KEY` (bypass RLS). Siapa pun bisa membaca data orang lain dengan menebak UUID.

Contoh terkonfirmasi:
- `GET /api/students/wallet-transactions?student_id=<uuid>` → seluruh transaksi wallet siswa
- `GET /api/students/wallet-balance?student_id=<uuid>` → saldo
- `GET /api/tutors/profile?user_id=<uuid>` → data profil pengajar (termasuk kontak)
- `GET /api/credit/me?user_id=<uuid>&role=tutor` → data kredit
- `GET/POST /api/match-schedules/*` (terminate, reschedule, review) → aksi pada jadwal orang lain
- `GET /api/match-files?match_id=<uuid>&user_id=<uuid>&role=...` → berkas kelas

Daftar lengkap route yang perlu guard (37 terdeteksi, ±8 memang publik):
```
/credit/daily-login, /credit/log, /credit/me
/match-files, /match-files/[fileId], /match-files/upload
/match-folders, /match-folders/[folderId]
/match-schedules, /match-schedules/[matchId]/* (extend, gmeet, private-folder-label,
  reschedule, review, terminate)
/matches/[matchId]/confirm, /matches/[matchId]/schedules
/sessions, /sessions/[sessionId]/cancel, /sessions/[sessionId]/ready
/students/my-matches, /students/onboarding, /students/status,
/students/wallet-balance, /students/wallet-transactions
/tutors/analytics-v2, /tutors/my-matches, /tutors/profile,
/tutors/wallet-balance, /tutors/wallet-transactions
/upload/avatar
```
**Perbaikan:** helper `requireUser()` (ambil sesi dari cookie), lalu selalu pakai `user.id`
(bukan input klien) + cek kepemilikan resource (`match.student_id === user.id`).

### 🔴 BLOCKER 2 — Endpoint debug publik
`/api/debug-hanging` **tanpa auth**, memakai service role, mengembalikan data sesi.
**Perbaikan:** hapus (atau lindungi `CRON_SECRET`).

### 🔴 BLOCKER 3 — Otorisasi role hanya di client
Middleware hanya cek "sudah login". `/dashboard/admin` dilindungi `allowedRoles` di client —
halaman tetap terkirim ke browser sebelum redirect. API admin sudah aman (cek role), tetapi
pertahanan harus di server.
**Perbaikan:** cek role di middleware untuk prefix `/dashboard/admin`, `/dashboard/tutor`, `/dashboard/student`.

### 🟠 HIGH
1. **189 `console.log`** — sebagian mencetak data sensitif (env presence, payload). Bersihkan untuk produksi.
2. **SEO/promosi belum siap**: tidak ada `app/sitemap.ts`, `app/robots.ts`; `openGraph` tanpa `images` (preview sosial kosong).
3. **Domain**: hanya `v0-edustory.vercel.app` / `v0-edu-story-website-design.vercel.app`. Untuk promosi perlu domain brand + redirect.
4. **Tidak ada test & CI** — tidak ada unit/e2e, tidak ada GitHub Actions.
5. `serverActions.bodySizeLimit: '150mb'` — terlalu besar, berisiko abuse.

### 🟡 MEDIUM
6. `images.unoptimized: true` → gambar tidak dioptimasi (LCP lambat).
7. `caniuse-lite` outdated (warning build).
8. Beberapa route mengembalikan `error.message` mentah ke klien (bocor detail DB).
9. Belum ada rate limiting pada endpoint AI/payment.
10. Monitoring/alerting belum ada (hanya Vercel Analytics).

---

## 5. Yang Sudah Bagus ✅
- Build bersih, TypeScript strict, struktur App Router rapi.
- Auth flow terdokumentasi & konsisten; maintenance mode dengan whitelist.
- Webhook Midtrans terverifikasi; cron terproteksi.
- PWA: service worker + manifest + halaman offline.
- Tidak ada secret ter-commit; service role tidak pernah dipakai di komponen client.
- Env terpisah production/preview/development di Vercel.
- Kurasi pengajar 5 tahap + AI assessment — diferensiasi produk kuat.

---

## 6. Rencana Perbaikan (usulan)

| Prioritas | Item | Estimasi |
| --- | --- | --- |
| P0 | Helper `requireUser` + terapkan ke ±29 route (ownership check) | 1 hari |
| P0 | Hapus/lindungi `/api/debug-hanging` | 15 menit |
| P0 | Role guard di middleware (`admin`/`tutor`/`student`) | 2 jam |
| P1 | Bersihkan `console.log` + jangan kirim `error.message` mentah | 3 jam |
| P1 | `sitemap.ts`, `robots.ts`, OG image 1200×630 | 2 jam |
| P1 | Domain brand + redirect + SSL | 1 jam |
| P2 | Test e2e alur kritis (daftar → bayar → jadwal → sesi) | 1–2 hari |
| P2 | Rate limit AI/payment, monitoring & alert | 1 hari |

**Rekomendasi:** jangan mulai promosi berbayar sebelum P0 selesai.
Setelah P0 + P1 beres (±2 hari), sistem layak untuk **soft launch** dan promosi bertahap.
