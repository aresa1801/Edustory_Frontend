# EduStory Authentication Flow Documentation

## Complete Auth Flow (Tested & Verified)

### For Regular Users (Student/Tutor)

#### Step 1: Login Page
- User clicks "Lanjutkan dengan Google" or logs in with email/password
- **Route:** `/auth/login`

#### Step 2: Google OAuth Callback
- Google redirects back to `/auth/callback`
- **Callback Logic:**
  - Checks if email is admin (`storyaunty.evi@gmail.com`)
  - If admin → **Redirect to `/dashboard/admin`** ✓
  - If NOT admin → **Checks if user profile exists in database**
  - If profile exists with role → **Redirect to `/dashboard/{role}`** ✓
  - If NO profile exists (first-time user) → **Redirect to `/auth/select-role`** ✓

#### Step 3: Select Role Page
- **Route:** `/auth/select-role`
- User selects role: **Siswa** or **Pengajar (Tutor)**
- **On Role Selection:**
  - Upsert user profile in database (creates it for new users, updates for existing ones)
  - Profile is populated with name/email/avatar from Google session metadata
  - **Redirect to `/dashboard/{role}`** ✓

#### Step 4: Dashboard
- **Routes:**
  - Siswa:   `/dashboard/student`
  - Tutor:   `/dashboard/tutor`
  - Admin:   `/dashboard/admin`

---

## Flow Summary

```
Google Login
    ↓
/auth/callback
    ↓
Is Admin Email? ──YES──> /dashboard/admin ✓
    ↓ NO
Has Profile with Role? ──YES──> /dashboard/{role} ✓
    ↓ NO (first-time user)
/auth/select-role ──> upsert profile + role ──> /dashboard/{role} ✓
```

> **Note:** The `/auth/register` page is no longer part of the Google OAuth flow.
> It remains available for email/password sign-up via the register button on the login page.

---

## Files & Components

### Auth Files
- `/app/auth/login/page.tsx`       — Login page with Google OAuth & email/password
- `/app/auth/callback/page.tsx`    — Auth callback handler (main router)
- `/app/auth/register/page.tsx`    — Email/password registration form
- `/app/auth/select-role/page.tsx` — Role selection (Siswa / Pengajar)

### Dashboard Files
- `/app/dashboard/student/page.tsx` — Student dashboard
- `/app/dashboard/tutor/page.tsx`   — Tutor dashboard
- `/app/dashboard/admin/page.tsx`   — Admin dashboard

---

## Debug Logs

Console logs have been added to all auth pages with `[v0]` prefix:

```javascript
// Auth Callback
console.log('[v0] Auth Callback - Session:', email, 'Provider:', provider)
console.log('[v0] Admin detected, redirecting to admin dashboard')
console.log('[v0] User profile not found, provider:', provider, '— redirecting to select-role')

// Select Role
console.log('[v0] Role selected:', role)
console.log('[v0] Upserting user profile with role:', role)
console.log('[v0] Role saved, redirecting to dashboard:', role)
```

Check the browser console to verify flow progression.

---

## Important Notes

1. **Admin users** are identified by email: `storyaunty.evi@gmail.com`
2. **First-time Google users** go directly to role selection — no separate register/profile step
3. **Profile creation** happens atomically in the select-role page via upsert (includes name, email, avatar from Google metadata)
4. **Role** is stored in the `user_profiles` table
5. All redirects use `router.push()` for client-side navigation

