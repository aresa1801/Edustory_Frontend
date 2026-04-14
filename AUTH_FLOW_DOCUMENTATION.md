# EduStory Authentication Flow Documentation

## Complete Auth Flow (Tested & Verified)

### For Regular Users (Student/Tutor)

#### Step 1: Login Page
- User clicks "Daftar dengan Google" or login with email
- **Route:** `/auth/login`

#### Step 2: Google OAuth Callback
- Google redirects back to `/auth/callback`
- **Callback Logic:**
  - Checks if email is admin (`storyaunty.evi@gmail.com`)
  - If admin → **Redirect to `/dashboard/admin`** ✓
  - If NOT admin → **Checks if user profile exists in database**
  - If profile exists with role → **Redirect to `/dashboard/{role}`**
  - If NO profile exists → **Check provider**
    - If Google provider → **Redirect to `/auth/register`**
    - If Email provider → **Redirect to `/auth/select-role`**

#### Step 3: Register Page (For Google Users)
- **Route:** `/auth/register`
- **Pre-filled Data:**
  - Name: Auto-filled from Google
  - Email: Auto-filled from Google
  - Password fields: **DISABLED** (hidden) for Google auth
- **On Form Submission:**
  - Create user profile in database
  - **Redirect to `/auth/select-role`** ✓

#### Step 4: Select Role Page
- **Route:** `/auth/select-role`
- User selects role: **Student** or **Tutor**
- **On Role Selection:**
  - Update user profile with role in database
  - **Redirect to `/dashboard/{role}`** ✓

#### Step 5: Dashboard
- **Routes:**
  - Student: `/dashboard/student`
  - Tutor: `/dashboard/tutor`
  - Admin: `/dashboard/admin`

---

## Flow Summary

```
Google Login
    ↓
/auth/callback
    ↓
Is Admin Email? ──YES──> /dashboard/admin ✓
    ↓ NO
Has Profile? ──YES──> /dashboard/{role} ✓
    ↓ NO
Is Google Provider? ──YES──> /auth/register ──> /auth/select-role ──> /dashboard/{role} ✓
    ↓ NO
──> /auth/select-role ──> /dashboard/{role} ✓
```

---

## Files & Components

### Auth Files
- `/app/auth/login/page.tsx` - Login page with Google OAuth
- `/app/auth/callback/page.tsx` - Auth callback handler (main router)
- `/app/auth/register/page.tsx` - Register form with Google pre-fill
- `/app/auth/select-role/page.tsx` - Role selection (Student/Tutor)

### Dashboard Files
- `/app/dashboard/student/page.tsx` - Student dashboard
- `/app/dashboard/tutor/page.tsx` - Tutor dashboard
- `/app/dashboard/admin/page.tsx` - Admin dashboard

---

## Debug Logs

Console logs have been added to all auth pages with `[v0]` prefix:

```javascript
// Auth Callback
console.log('[v0] Auth Callback - Session:', email, 'Provider:', provider)
console.log('[v0] Admin detected, redirecting to admin dashboard')
console.log('[v0] Google user, redirecting to register')

// Register Page
console.log('[v0] Register page - Session:', email, 'Provider:', provider)
console.log('[v0] Google OAuth detected, pre-filling form')
console.log('[v0] Profile created, redirecting to select-role')

// Select Role
console.log('[v0] Role selected:', role)
console.log('[v0] Role updated, redirecting to dashboard:', role)
```

Check browser console to verify flow progression.

---

## Important Notes

1. **Admin users** are identified by email: `storyaunty.evi@gmail.com`
2. **Password fields** are only shown for email/password signup, NOT for Google OAuth
3. **User profile** is created in database before role selection
4. **Role** is stored in the `user_profiles` table
5. All redirects use `router.push()` for client-side navigation
