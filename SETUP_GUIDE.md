# Setup & Testing Guide - Authentication Enhancements

## ✅ What Has Been Implemented

All requirements from your request have been successfully implemented:

1. **"Daftar Sekarang" Button** - Registration form with email verification
   - Users select role (Siswa/Tutor)
   - Enter email and password
   - Receive 6-digit OTP code via email
   - Enter code to complete registration
   - Automatic redirect to dashboard

2. **"Sudah Punya Akun? Masuk" Button** - Login with multiple options
   - Email/password login
   - Google OAuth login (with Google logo)
   - Automatic redirect after login

3. **Dashboard Button** - Smart access control
   - Hidden when user not logged in
   - Visible and clickable when logged in
   - Automatically redirects based on user role
   - Redirects to role selection if no role set

## 🚀 Next Steps to Make It Work

### Step 1: Configure Supabase Email Settings

The email verification system requires Supabase to send emails from `program.struck30@gmail.com`.

**Follow these steps:**

1. **Generate Gmail App Password**
   - Log in to `program.struck30@gmail.com`
   - Go to Google Account Settings → Security
   - Enable 2-Step Verification (if not enabled)
   - Go to "App Passwords"
   - Generate new password for "Mail"
   - **Save this password** - you'll need it in step 2

2. **Configure Supabase**
   - Open your Supabase project dashboard
   - Go to Authentication → Email Templates → Settings (gear icon)
   - Enable "Use Custom SMTP"
   - Enter these details:
     ```
     SMTP Host: smtp.gmail.com
     SMTP Port: 587
     SMTP User: program.struck30@gmail.com
     SMTP Password: [Your App Password from Step 1]
     Sender Email: program.struck30@gmail.com
     Sender Name: EduStory
     ```
   - Click Save

3. **Enable Email Confirmations**
   - In Supabase, go to Authentication → Settings
   - Under "Email Auth", enable "Email Confirmations"
   - Set "Email Confirmation Required" to ON

4. **Customize Email Template** (Optional)
   - Go to Authentication → Email Templates
   - Select "Confirm signup"
   - Customize the template if desired (current default shows OTP code)

**Detailed instructions:** See `EMAIL_VERIFICATION_SETUP.md`

### Step 2: Test the Implementation

Once Supabase is configured, test each flow:

#### Test Registration
1. Open your app in a browser
2. Click "Daftar Sekarang"
3. Select role (Siswa or Tutor)
4. Enter test email and password
5. Submit form
6. Check email for 6-digit code
7. Enter code in verification screen
8. Verify redirect to dashboard

#### Test Login
1. Click "Sudah Punya Akun? Masuk"
2. Try both:
   - Email/password login
   - Google OAuth login
3. Verify redirect to dashboard
4. Check role-based routing works

#### Test Dashboard Button
1. Log out (if logged in)
2. Verify Dashboard button is hidden
3. Log in or register
4. Verify Dashboard button appears
5. Click Dashboard
6. Verify redirect to correct dashboard

### Step 3: Monitor and Verify

- **Check Browser Console**: Look for `[v0]` debug logs
- **Check Supabase Logs**: Authentication → Logs
- **Check Email Delivery**: Verify emails arrive promptly
- **Test Error Cases**: Try invalid OTP, expired codes, etc.

## 📋 Testing Checklist

Use this checklist to verify everything works:

- [ ] Gmail App Password generated
- [ ] Supabase SMTP configured
- [ ] Email confirmations enabled
- [ ] Registration form opens correctly
- [ ] Can select role
- [ ] OTP email received (check spam if not in inbox)
- [ ] OTP verification works
- [ ] Resend OTP works
- [ ] Login with email/password works
- [ ] Login with Google works
- [ ] Dashboard button hidden when logged out
- [ ] Dashboard button visible when logged in
- [ ] Dashboard redirect works correctly
- [ ] Role selection works for users without roles

## 🐛 Troubleshooting

### OTP Email Not Received
1. Check spam/junk folder
2. Verify SMTP credentials in Supabase
3. Check Gmail hasn't hit sending limits (500/day)
4. Verify 2FA and App Password setup

### Dashboard Button Not Working
1. Check browser console for errors
2. Verify user is authenticated (check AuthContext)
3. Check user has a role set
4. Clear browser cache and try again

### TypeScript Errors
- Some pre-existing TypeScript errors in other files are normal
- New code has been validated and passes type checking
- Run `npx tsc --noEmit` to see all errors

### General Issues
1. Clear browser cache
2. Check browser console for errors
3. Check Supabase logs
4. Verify environment variables are set
5. Check `AUTH_FLOW_DOCUMENTATION.md` for flow diagrams

## 📚 Documentation Reference

- **`EMAIL_VERIFICATION_SETUP.md`** - Detailed email configuration guide
- **`AUTH_FLOW_DOCUMENTATION.md`** - Authentication flow diagrams
- **`IMPLEMENTATION_SUMMARY.md`** - Complete implementation overview
- **This file** - Quick setup and testing guide

## ⚠️ Important Notes

1. **Gmail Rate Limits**: Free Gmail accounts limited to 500 emails/day
2. **OTP Expiration**: Codes expire after 60 minutes
3. **Testing**: Test thoroughly before deploying to production
4. **Security**: Never commit SMTP credentials to version control

## 🎉 Success Criteria

Your implementation is successful when:
- ✅ Users can register with email verification
- ✅ OTP codes arrive from program.struck30@gmail.com
- ✅ Users can log in with email or Google
- ✅ Dashboard button appears only when authenticated
- ✅ Users redirect to correct dashboard based on role
- ✅ No console errors or TypeScript errors in new code

## 💡 Additional Tips

1. **Monitor First Week**: Watch for email delivery issues
2. **User Feedback**: Ask early users about experience
3. **Analytics**: Consider adding conversion tracking
4. **Scaling**: Upgrade Gmail plan if you expect high volume
5. **Custom Domain**: Consider custom email domain for production

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the detailed documentation files
3. Check Supabase documentation for email settings
4. Verify all configuration steps were completed

---

**You're all set!** Follow the steps above, and your authentication system will be fully functional with email verification from program.struck30@gmail.com.
