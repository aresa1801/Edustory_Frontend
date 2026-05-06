# EduStory Authentication Flow Documentation

## Complete Auth Flow (Tested & Verified)

### For Regular Users (Student/Tutor)

#### Flow A: Registration via Homepage Popup (Daftar Sekarang)

The homepage popup (`AuthModal`) lets users pick a role **before** authenticating.

##### A1 — Register with Google
1. User opens popup, selects role (**Siswa** or **Tutor**), clicks **Google**
2. Role is stored in `localStorage` (`pendingRole`) before the OAuth redirect
3. Google OAuth redirects back to `/auth/callback`
4. Callback checks `user_profiles` → not found (new user)
5. Callback reads `pendingRole` from `localStorage`, clears it, calls `/api/auth/set-role`
6. **Redirect to `/dashboard/student/onboarding`** (student) or **`/dashboard/tutor`** (tutor) ✓

##### A2 — Register with Email/Password
1. User opens popup, selects role, fills email/password, clicks **Daftar**
2. Supabase creates the auth user; if a session is immediately available:
3. `/api/auth/set-role` is called to create `user_profiles` with the selected role
4. **Redirect to `/dashboard/student/onboarding`** (student) or **`/dashboard/tutor`** (tutor) ✓

---

#### Flow B: Login via Homepage Popup (Masuk)

1. User opens popup, enters email/password (or clicks Google), clicks **Masuk**
2. After sign-in, `user_profiles` is queried for the user's role
3. **Redirect to `/dashboard/{role}`** based on the stored role ✓

---

#### Flow C: Direct Google Login (from `/auth/login`)

1. User clicks "Lanjutkan dengan Google" on the login page
2. Google OAuth redirects back to `/auth/callback`
3. **Callback Logic:**
   - Checks if email is admin (`storyaunty.evi@gmail.com`) → `/dashboard/admin` ✓
   - If profile exists with role → `/dashboard/{role}` ✓
   - If NO profile and `pendingRole` in localStorage → auto-create profile and redirect ✓
   - If NO profile and no `pendingRole` → `/auth/select-role` (manual role pick) ✓

---

## Flow Summary

```
Homepage Popup — Daftar (Google)
    ↓
Store pendingRole in localStorage
    ↓
Google OAuth → /auth/callback
    ↓
Is Admin? ──YES──> /dashboard/admin ✓
    ↓ NO
Has Profile? ──YES──> /dashboard/{role} ✓
    ↓ NO
pendingRole in localStorage? ──YES──> set-role API → /dashboard/{role} ✓
    ↓ NO
/auth/select-role ──> upsert profile + role ──> /dashboard/{role} ✓
```

```
Homepage Popup — Daftar (Email/Password)
    ↓
signUp() → session available?
    ├─YES──> set-role API → /dashboard/{role} ✓
    └─NO───> close dialog (email confirmation pending)
```

---

## Files & Components

### Auth Files
- `/app/auth/login/page.tsx`       — Login page with Google OAuth & email/password
- `/app/auth/callback/page.tsx`    — Auth callback handler (main router); reads `pendingRole`
- `/app/auth/register/page.tsx`    — Email/password registration form (standalone)
- `/app/auth/select-role/page.tsx` — Role selection fallback (Siswa / Pengajar)

### Homepage Auth Popup
- `/components/auth/auth-modal.tsx` — Registration/login modal with role selector;
                                      stores `pendingRole` before Google OAuth redirect

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
console.log('[v0] User profile not found, provider:', provider)
console.log('[v0] pendingRole found:', role, '— creating profile and redirecting to dashboard')
console.log('[v0] Redirecting to select-role')

// Select Role
console.log('[v0] Role selected:', role)
console.log('[v0] Role saved, redirecting to dashboard:', role)
```

Check the browser console to verify flow progression.

---

## Important Notes

1. **Admin users** are identified by email: `storyaunty.evi@gmail.com`
2. **Homepage popup** users pre-select their role — `pendingRole` is stored in `localStorage`
   before the Google OAuth redirect and cleared immediately after use.
3. **Fallback**: if `pendingRole` is missing (e.g. direct `/auth/login` flow) the user is sent
   to `/auth/select-role` to pick their role manually.
4. **Profile creation** happens via the `/api/auth/set-role` API route which uses the service
   role key to bypass RLS. It upserts the record including name, email, and avatar.
5. **Role** is stored in the `user_profiles` table as `siswa` (student) or `tutor`.
6. All redirects use `router.push()` for client-side navigation.

