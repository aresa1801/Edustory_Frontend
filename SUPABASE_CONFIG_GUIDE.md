# Panduan Konfigurasi Supabase untuk Email Verification

## Masalah yang Diperbaiki

1. **User bypass halaman selected-role**: User yang login/register langsung masuk ke dashboard tanpa memilih role terlebih dahulu
2. **Email verification tidak berfungsi**: User tidak menerima kode OTP dari email `program.struck30@gmail.com`

## Solusi yang Diterapkan

### 1. Perbaikan Flow Autentikasi

#### A. Callback Handler (`/app/auth/callback/page.tsx`)
- ✅ Menambahkan pengecekan `email_confirmed_at` untuk memastikan email sudah diverifikasi
- ✅ Menambahkan logging untuk debugging
- ✅ Memastikan user tanpa profile diarahkan ke `/auth/select-role`
- ✅ Memastikan `pendingRole` dari localStorage digunakan dengan benar

#### B. Select Role Page (`/app/auth/select-role/page.tsx`)
- ✅ Menggunakan API `/api/auth/set-role` untuk membuat profile dengan benar
- ✅ Memastikan profile dibuat dengan service role key (bypass RLS)
- ✅ Menambahkan logging untuk debugging

#### C. Auth Modal (`/components/auth/auth-modal.tsx`)
- ✅ Menyimpan `pendingRole` di localStorage sebelum signup
- ✅ Mengambil `pendingRole` saat verifikasi OTP
- ✅ Menambahkan error handling yang lebih baik
- ✅ Menambahkan logging untuk debugging

#### D. Auth Context (`/lib/auth-context.tsx`)
- ✅ Menyimpan `pendingRole` saat signup
- ✅ Menambahkan `emailRedirectTo` untuk OAuth callback

## Konfigurasi Supabase yang Diperlukan

### 1. Email Authentication Settings

Masuk ke **Supabase Dashboard** → **Authentication** → **Settings** → **Email Auth**

#### A. Enable Email Confirmations
```
✅ Enable email confirmations
✅ Confirm email
```

**Penting**: Ini akan memastikan user harus verifikasi email sebelum bisa login.

#### B. Email Template Configuration
Pergi ke **Authentication** → **Email Templates** → **Confirm signup**

Pastikan template menggunakan token (OTP):
```html
<h2>Verifikasi Email Anda</h2>
<p>Halo,</p>
<p>Terima kasih telah mendaftar di EduStory! Untuk melanjutkan, silakan verifikasi email Anda dengan memasukkan kode berikut:</p>
<h1 style="font-size: 32px; letter-spacing: 5px; font-family: monospace;">{{ .Token }}</h1>
<p>Kode ini akan kedaluwarsa dalam 60 menit.</p>
<p>Jika Anda tidak mendaftar di EduStory, abaikan email ini.</p>
<p>Salam,<br>Tim EduStory</p>
```

### 2. SMTP Configuration

Untuk mengirim email dari `program.struck30@gmail.com`:

#### A. Setup Gmail App Password

1. Login ke `program.struck30@gmail.com`
2. Pergi ke **Google Account Settings** → **Security**
3. Enable **2-Step Verification**
4. Pergi ke **App Passwords**
5. Generate password baru untuk "Mail"
6. Simpan password ini (format: xxxx xxxx xxxx xxxx)

#### B. Configure Supabase SMTP

Masuk ke **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**

```
Enable Custom SMTP: ✅ ON

SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: program.struck30@gmail.com
SMTP Password: [App Password dari step A]
Sender Email: program.struck30@gmail.com
Sender Name: EduStory
```

**Klik Save** untuk menyimpan konfigurasi.

### 3. OAuth Redirect URLs

Masuk ke **Supabase Dashboard** → **Authentication** → **Settings** → **URL Configuration**

Tambahkan redirect URLs:
```
Site URL: https://your-domain.com (atau http://localhost:3000 untuk development)

Redirect URLs:
- http://localhost:3000/auth/callback
- https://your-domain.com/auth/callback
```

### 4. Database Setup

Pastikan tabel `user_profiles` sudah ada dengan struktur:

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('siswa', 'tutor', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Note**: API `/api/auth/set-role` menggunakan service role key untuk bypass RLS saat membuat profile baru.

### 5. Environment Variables

Pastikan file `.env.local` (atau Vercel environment variables) memiliki:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**PENTING**: `SUPABASE_SERVICE_ROLE_KEY` harus di-set di environment variables (Vercel/Server) dan **TIDAK BOLEH** di-commit ke Git!

## Cara Testing

### Test 1: Registration dengan Email/Password

1. Buka homepage, klik "Daftar Sekarang"
2. Pilih role (Siswa atau Tutor)
3. Masukkan email dan password
4. Klik "Daftar"
5. **Expected**: 
   - Tampil form OTP verification
   - Email diterima di inbox (atau spam) dengan 6-digit code
   - Masukkan code, klik "Verifikasi"
   - Redirect ke dashboard sesuai role

### Test 2: Registration dengan Google

1. Buka homepage, klik "Daftar Sekarang"
2. Pilih role (Siswa atau Tutor)
3. Klik "Google"
4. Login dengan Google account
5. **Expected**: 
   - Email ter-confirm otomatis (Google OAuth)
   - Profile dibuat dengan role yang dipilih
   - Redirect ke dashboard sesuai role

### Test 3: Login Existing User

1. Buka homepage, klik "Masuk"
2. Masukkan email dan password
3. Klik "Masuk"
4. **Expected**: 
   - Login berhasil
   - Redirect ke dashboard sesuai role yang tersimpan

### Test 4: Login User Tanpa Role

1. Buka homepage, klik "Masuk"
2. Login dengan account yang belum punya role
3. **Expected**: 
   - Login berhasil
   - Redirect ke `/auth/select-role`
   - Pilih role
   - Profile dibuat
   - Redirect ke dashboard sesuai role

## Troubleshooting

### Email tidak diterima

1. **Check spam folder** - Gmail sering menaruh email verifikasi di spam
2. **Check SMTP configuration** - Pastikan SMTP settings sudah benar di Supabase
3. **Check Gmail app password** - Pastikan app password masih valid
4. **Check Supabase logs** - Pergi ke **Logs** → **Auth** untuk melihat error
5. **Check email rate limits** - Gmail free tier: 500 emails/day

### User bypass role selection

1. **Check browser console** - Cari log dengan prefix `[AuthCallback]`, `[SelectRole]`, `[AuthModal]`
2. **Check localStorage** - Buka DevTools → Application → Local Storage, cari key `pendingRole`
3. **Check user_profiles table** - Query Supabase untuk cek apakah profile ada dan role sudah di-set
4. **Check middleware** - Pastikan middleware di `/middleware.ts` tidak interfere

### OTP verification gagal

1. **Check console logs** - Cari error message
2. **Check kode sudah expire** - OTP expire setelah 60 menit
3. **Check email benar** - Pastikan email yang dimasukkan sama dengan yang signup
4. **Resend OTP** - Klik "Kirim ulang" untuk dapat kode baru

### Profile tidak terbuat

1. **Check `SUPABASE_SERVICE_ROLE_KEY`** - Pastikan environment variable sudah di-set di Vercel
2. **Check API logs** - Di browser Network tab, check response dari `/api/auth/set-role`
3. **Check database RLS** - Pastikan policy tidak block service role
4. **Check user_profiles table** - Pastikan kolom yang required ada (id, email, role)

## Debug Mode

Untuk melihat log debugging, buka **Browser Console** (F12) dan cari:

- `[AuthCallback]` - Log dari auth callback handler
- `[SelectRole]` - Log dari role selection page
- `[AuthModal]` - Log dari auth modal component
- `[API]` - Log dari API routes

## Checklist Konfigurasi

Sebelum deploy ke production, pastikan:

- [ ] SMTP configured di Supabase (Gmail app password)
- [ ] Email confirmations enabled di Supabase
- [ ] Email template sudah di-customize
- [ ] Redirect URLs sudah ditambahkan
- [ ] `user_profiles` table sudah ada
- [ ] RLS policies sudah di-set
- [ ] Environment variables sudah di-set (termasuk `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Test semua flow (email signup, Google signup, login)

## Support

Jika masih ada masalah, check:
- Supabase documentation: https://supabase.com/docs/guides/auth
- Next.js Supabase integration: https://supabase.com/docs/guides/auth/server-side/nextjs
- Gmail SMTP setup: https://support.google.com/a/answer/176600

---

**Last Updated**: 2026-06-19
**Status**: ✅ All authentication flows fixed and synchronized with Supabase
