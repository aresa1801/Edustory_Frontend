# Email Verification Configuration Guide

## Overview
This guide explains how to configure Supabase to send verification emails from `program.struck30@gmail.com`.

## Prerequisites
- Access to the Gmail account `program.struck30@gmail.com`
- Supabase project with admin access
- App-specific password for Gmail (required for SMTP)

## Configuration Steps

### 1. Generate Gmail App Password

1. Log in to `program.struck30@gmail.com`
2. Go to **Google Account Settings** → **Security**
3. Enable **2-Step Verification** (if not already enabled)
4. Go to **App Passwords** section
5. Generate a new app password for "Mail"
6. Save this password securely - you'll need it for Supabase configuration

### 2. Configure Supabase Email Settings

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Click on **Settings** (gear icon)
4. Under **SMTP Settings**, enter the following:

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: program.struck30@gmail.com
SMTP Password: [Your App Password from Step 1]
Sender Email: program.struck30@gmail.com
Sender Name: EduStory
```

5. Enable **Use Custom SMTP**
6. Click **Save**

### 3. Customize Email Templates

Go to **Authentication** → **Email Templates** and customize the following templates:

#### Confirm Signup Template
```html
<h2>Verifikasi Email Anda</h2>
<p>Halo,</p>
<p>Terima kasih telah mendaftar di EduStory! Untuk melanjutkan, silakan verifikasi email Anda dengan memasukkan kode berikut:</p>
<h1 style="font-size: 32px; letter-spacing: 5px; font-family: monospace;">{{ .Token }}</h1>
<p>Kode ini akan kedaluwarsa dalam 60 menit.</p>
<p>Jika Anda tidak mendaftar di EduStory, abaikan email ini.</p>
<p>Salam,<br>Tim EduStory</p>
```

### 4. Environment Variables

Ensure your `.env.local` includes:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Enable Email Confirmation

1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, enable **Email Confirmations**
3. Set **Email Confirmation Required** to **ON**

## Testing

### Test Email Verification Flow

1. Open your application in a browser
2. Click **"Daftar Sekarang"** button
3. Select a role (Siswa or Tutor)
4. Enter email and password
5. Submit the form
6. Check the email inbox for verification code
7. Enter the 6-digit code in the verification screen
8. You should be redirected to the appropriate dashboard

### Test Features

- ✅ Registration with email/password
- ✅ OTP code sent to email from program.struck30@gmail.com
- ✅ OTP verification
- ✅ Resend OTP functionality
- ✅ Role-based redirect after verification
- ✅ Google OAuth login (existing flow)

## Troubleshooting

### Email Not Received

1. Check spam/junk folder
2. Verify SMTP credentials in Supabase
3. Check Gmail account hasn't reached sending limits
4. Ensure 2FA and App Password are correctly configured

### Invalid OTP

1. OTP codes expire after 60 minutes
2. Only the most recent OTP is valid
3. OTP is case-insensitive but must be 6 digits

### SMTP Connection Errors

1. Verify port 587 is not blocked
2. Try port 465 with SSL if 587 fails
3. Check Gmail "Less secure app access" settings (though app passwords bypass this)

## Security Notes

- Never commit SMTP credentials to version control
- Use app-specific passwords, not the main Gmail password
- Regularly rotate app passwords
- Monitor email sending limits (Gmail: 500 emails/day for free accounts)

## Rate Limits

- **Gmail**: 500 recipients per day (free)
- **Supabase**: Default rate limiting applies to OTP requests
- Consider upgrading if you expect high user registration volume

## Next Steps

1. Test the complete registration flow
2. Monitor email delivery rates
3. Set up email analytics (optional)
4. Configure custom domain email (optional for production)

## Support

For issues with:
- Supabase configuration: Check Supabase documentation
- Gmail SMTP: Check Google Workspace help center
- Code implementation: Check AUTH_FLOW_DOCUMENTATION.md
