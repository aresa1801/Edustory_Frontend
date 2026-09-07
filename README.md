# 🎓 Edustory — Frontend

Platform **pasar tutor privat** (mahasiswa mengajar siswa SD/SMP/SMA) berbasis
[Next.js](https://nextjs.org) (App Router) + [Supabase](https://supabase.com) + AI
[DeepSeek](https://deepseek.com) untuk **kurasi & penilaian calon tutor secara otomatis**.

> Repo lama di-bootstrap lewat v0; kini dikembangkan langsung di sini.
> Setiap merge ke `main` akan otomatis di-deploy.

---

## ✨ Fitur Utama

- **Pendaftaran multi-peran** — daftar & pilih peran: **tutor**, **siswa/orang tua**, atau admin.
- **Pipeline kurasi tutor berbasis AI** — sebelum tampil di pasar, calon tutor melewati 5 tahap
  penilaian yang dinilai otomatis oleh AI (lihat [Kurasi AI](#-kurasi-ai--alur-5-tahap)).
- **Dashboard terpisah** utk **admin**, **tutor**, dan **siswa/orang tua**.
- **Pembayaran lokal** — integrasi **Midtrans** (transfer bank, e-wallet, dll).
- **Blog** & halaman perusahaan (maintenance mode tersedia bila perlu turun).

---

## 🧠 Kurasi AI — Alur 5 Tahap

Setiap calon tutor dinilai dalam **5 tahap kurasi**. Semua hasil **dinilai & di-scoring oleh AI
di sisi server** (klien tidak pernah mengirim skor → adil & tak bisa dicurangi), dengan skala
**seragam 0–100** (lulus jika **≥ 70**).

| No | Tahap | Folder (`app/curation/`) | Yang dinilai AI |
|----|-------|--------------------------|-----------------|
| 1 | **Tes Psikologi** (bobot 20%) | `psychology-test` | Skenario situasional → atribut tutor (empati, manajemen kelas, integritas, komunikasi, dukungan, growth mindset). Tanpa "satu jawaban benar" — AI menilai kualitas tindakan. |
| 2 | **Tes Akademik** (bobot 30%) | `academic-test` | SD/SMP = **bank soal statis terkurasi** (kunci hanya di server); SMA = **soal AI-generatif** dinilai grader AI independen — semua lintas kelas & mata pelajaran. |
| 3 | **Micro Teaching** (bobot 25%) | `microteaching` | Penjelasan mengajar **berbasis teks** → kejelasan, struktur, keterlibatan, akurasi materi. |
| 4 | **Penjelasan & Logika** (bobot 15%) | `handwriting` | Jawaban tertulis + cara menjelaskan → akurasi & kualitas penjelasan. |
| 5 | **AI Interview** (bobot 10%) | `interview` | Wawancara percakapan AI → rekomendasi final. Bila model gagal, **tidak ada auto-reject** (retryable, tanpa skor palsu). |

### Logika penilaian (server-authoritative)

- **Kunci jawaban soal akademik (SD/SMP) tersimpan hanya di server** (`lib/curation/academic-bank.ts`)
  → soal yang tampil di browser tidak membawa kunci, tidak bisa di-copy atau ditebak dari payload.
- Semua skor dihitung & disimpan di **route API**, bukan di browser (lihat `app/api/assessments/`).
- Setiap tahap mengembalikan **pecahan per-dimensi + ringkasan/justifikasi** agar transparan & mudah diaudit.
- File logika inti ada di `lib/curation/`: `levels.ts`, `academic-bank.ts`, `grading.ts`, `ai-grader.ts`.

---

## 🧱 Stack & Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend / Server | **Next.js (App Router)** + React + TypeScript |
| UI | shadcn/ui (Radix), Tailwind CSS, lucide-react |
| Backend-as-a-Service | **Supabase** (Auth + PostgreSQL + Storage + RLS) |
| AI (kurasi & penilaian) | **DeepSeek** (`deepseek-chat`) — lihat `lib/deepseek.ts` |
| Pembayaran | **Midtrans** |
| Deploy | Vercel |

---

## 📁 Struktur Project

```
app/
├── page.tsx               # Landing page
├── auth/  login/  register/   # Autentikasi & pilih peran
├── curation/            # Pipeline kurasi tutor (5 tahap + progres)
│   ├── psychology-test/ academic-test/ microteaching/
│   ├── handwriting/ interview/ progress/
├── dashboard/           # Admin / Tutor / Student
├── blog/                # Halaman blog
└── api/                 # Route handlers (auth, currency, payment, AI, assessments…)
components/              # Komponen UI & dashboard
lib/
├── curation/            # Logika kurasi AI (levels, bank soal, grading, ai-grader)
├── supabase/            # Klien Supabase (browser & server)
└── deepseek.ts          # Wrapper DeepSeek (chat & JSON)
scripts/                 # SQL migration Supabase (000 → 009) + skema kurasi
```

---

## 🔧 Variabel Lingkungan (.env)

Salin ke `.env.local` dan isi sesuai kredensial project lo:

```bash
# ── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # ⚠️ server-side saja, JANGAN bocor ke publik

# ── AI (DeepSeek) ─────────────────────────────────────────
DEEPSEEK_API_KEY=<deepseek-api-key>

# ── Midtrans (pembayaran) ─────────────────────────────────
MIDTRANS_SERVER_KEY=<midtrans-server-key>
```

> ⚠️ **Keamanan:** `SUPABASE_SERVICE_ROLE_KEY` & `MIDTRANS_SERVER_KEY` bersifat rahasia —
> hanya boleh dipakai di server (route handler / server components), **jangan** prefix `NEXT_PUBLIC_`.

---

## 🚀 Menjalankan Secara Lokal

```bash
npm install        # atau pnpm/yarn
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

> **Prasyarat:** database supabase sudah dijalankan skema di `scripts/` (lihat [Skema Database](#-skema-database--sql-migration)), dan `.env.local` terisi.

---

## 🗄️ Skema Database (SQL Migration)

Seluruh skema ada di folder `scripts/` dan dijalankan berurutan:

- `000_fresh_install.sql` / `001_create_tables.sql` — struktur inti (users, tutors, students, dll).
- `002_create_assessment_tables.sql` — tabel penilaian kurasi + `curation_progress`.
- `003_grade_levels_and_rls.sql` — RLS & kolom jenjang (`level_targeted`).
- `003_payment_and_profile_fields.sql` dst. (`004`–`009`) — pembayaran, profil, onboarding, dsb.
- `007_redesign_complete.sql` — skema lengkap hasil redesign (termasuk tampilan db).

> Jika memulai dari nol, gunakan `000_fresh_install.sql` sebagai dasar lalu terapkan skema lain
> sesuai kebutuhan. Migrasi bersifat idempotent sebagian — tinjau sebelum eksekusi di production.

---

## 🤝 Kontribusi

1. Buat **branch** baru dari `main` (mis. `feat/…`, `fix/…`, `refactor/…`).
2. Jangan push langsung ke `main`.
3. Buat **Pull Request** dan minta review sebelum merge.
4. Pastikan tidak ada error TypeScript sebelum submit: `npx tsc --noEmit`.
5. Untuk perubahan schema DB, tambahkan file migration baru di `scripts/` (jangan edit migration lama yang sudah terpakai di production).

---

## 📄 Referensi

- [AUTH_FLOW_DOCUMENTATION.md](./AUTH_FLOW_DOCUMENTATION.md) — penjelasan alur autentikasi.
- [Next.js Docs](https://nextjs.org/docs) · [Supabase Docs](https://supabase.com/docs)
- [Open in Kiro](https://v0.app/chat/api/kiro/clone/aresa1801/Edustory_Frontend)
