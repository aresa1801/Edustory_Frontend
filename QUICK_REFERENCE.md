# Quick Reference: Perbaikan Autentikasi

## ⚡ Masalah yang Diperbaiki

1. ✅ User bisa bypass halaman selected-role
2. ✅ Email verification dengan OTP tidak berfungsi

## 📋 Konfigurasi Supabase yang HARUS Dilakukan

### Step 1: Enable Email Confirmations
```
Supabase → Authentication → Settings → Email Auth
☑ Enable email confirmations
☑ Confirm email
```

### Step 2: Setup SMTP (untuk program.struck30@gmail.com)
```
1. Gmail: Generate App Password di Google Account Settings
2. Supabase → Project Settings → Auth → SMTP Settings:
   - Host: smtp.gmail.com
   - Port: 587
   - User: program.struck30@gmail.com
   - Pass: [App Password]
```

### Step 3: Set Environment Variable
```
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```
⚠️ **PENTING**: Harus di-set di Vercel/Server environment!

## 🔍 Cara Testing

### Test Email Signup
1. Daftar dengan email → Receive OTP → Verify → Dashboard ✅

### Test Google Signup
1. Daftar dengan Google → Select role → Dashboard ✅

### Test Login
1. Login → Auto-redirect ke dashboard atau select-role ✅

## 🐛 Debug

Buka Browser Console (F12), cari log:
- `[AuthCallback]` - Auth callback flow
- `[SelectRole]` - Role selection
- `[AuthModal]` - Modal auth flow

## 📚 Documentation

- **Full Guide**: `/SUPABASE_CONFIG_GUIDE.md`
- **Fix Summary**: `/FIX_SUMMARY.md`
- **Auth Flow**: `/AUTH_FLOW_DOCUMENTATION.md`

## ❓ Troubleshooting

**Email tidak diterima?**
→ Check spam folder, verify SMTP settings

**User bypass role selection?**
→ Check console logs, verify user_profiles table

**OTP invalid?**
→ Code expire 60 menit, bisa resend

## 📞 Contact

Jika ada masalah, check documentation atau review code changes di PR.

---
Last Updated: 2026-06-19
