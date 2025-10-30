# Admin Dashboard & Email Notifications Setup

Quick setup guide for the admin dashboard and email notifications features.

## Part 1: Admin Role Setup

### 1. Run Admin SQL Script

```bash
# In Supabase Dashboard > SQL Editor
# Copy and run: supabase-admin-setup.sql
```

### 2. Add Your User as Admin

Find your user ID in Supabase Dashboard > Authentication > Users, then:

```sql
INSERT INTO public.admin_users (user_id, display_name, email)
VALUES ('YOUR_USER_ID_HERE', 'Your Name', 'your.email@example.com');
```

**Note**: Including your name and email is optional but recommended. It makes the admin dashboard more user-friendly by showing names instead of UUIDs.

**If you already added yourself without a name**, update your record:
```sql
UPDATE public.admin_users
SET display_name = 'Your Name',
    email = 'your.email@example.com'
WHERE user_id = 'YOUR_USER_ID_HERE';
```

Verify:
```sql
SELECT * FROM public.admin_users;
```

## Part 2: Email Notifications Setup

### 1. Get Resend API Key

1. Sign up at https://resend.com
2. Verify your domain (or use test mode)
3. Get your API key from Dashboard > API Keys

### 2. Add Environment Variables

Add to `.env.local`:

```env
# Resend Email
RESEND_API_KEY=re_your_api_key_here
ADMIN_EMAIL=admin@yourdomain.com

# Optional: App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Update Email "From" Address

Edit `lib/email/resend-client.ts`:

```typescript
from: 'Food & Fitness AI <notifications@YOUR-VERIFIED-DOMAIN.com>'
```

Replace with your verified Resend domain.

## Part 3: Test the Features

### Test Admin Dashboard

1. Start dev server: `pnpm dev`
2. Log in with your admin account
3. Click "Admin" in navbar
4. Should see `/admin/feedback` page
5. Submit test feedback and verify it appears
6. Test status updates

### Test Email Notifications

1. Submit feedback with email address
2. Check admin email for notification
3. Check user email for confirmation
4. Logs will show: `✅ Feedback notification sent:` or `✅ Confirmation email sent:`

**Note**: If `RESEND_API_KEY` is not set, emails are skipped (won't cause errors).

## Features Included

### Admin Dashboard (`/admin/feedback`)
- ✅ View all feedback submissions
- ✅ Filter by status (pending, reviewed, resolved, closed)
- ✅ Filter by type (bug, feature, complaint, general)
- ✅ Update feedback status
- ✅ View user info and attachments
- ✅ Real-time refresh

### Email Notifications
- ✅ Admin notification on new feedback
- ✅ User confirmation email (if email provided)
- ✅ Non-blocking (doesn't fail if email fails)
- ✅ Detailed logging

## Troubleshooting

### "Unauthorized - Admin access required" OR Admin tab not showing

**Cause 1**: User not in `admin_users` table

**Solution**: Add your user ID to `admin_users` table (see Part 1, Step 2)

**Cause 2**: RLS circular dependency on `admin_users` table

**Symptoms**:
- You've added yourself to `admin_users` table
- Admin tab still doesn't show in navbar
- No errors in console

**Solution**: Run the RLS fix script:
```bash
# In Supabase Dashboard > SQL Editor
# Run: supabase-admin-rls-fix.sql
```

This disables RLS on `admin_users` table (safe - it only contains user IDs). Then:
1. Restart dev server: `pnpm dev`
2. Log out and log back in
3. Admin tab should now appear!

### "Failed to send feedback notification"

**Cause**: Invalid Resend API key or unverified domain

**Solution**:
1. Check `RESEND_API_KEY` in `.env.local`
2. Verify your domain in Resend dashboard
3. Update `from` email address in `lib/email/resend-client.ts`

### Emails not sending

**Cause**: Missing environment variables

**Solution**:
1. Check `.env.local` has `RESEND_API_KEY`
2. Restart dev server after adding env vars
3. Check server logs for error messages

## Future Enhancements

This is a functional MVP. Consider adding:

- 📊 Analytics dashboard with charts (feedback over time, by type, etc.)
- 🔍 Search functionality for feedback
- 💬 Admin response/notes field
- 📧 More email templates (status change notifications)
- 🚀 Bulk actions (update multiple feedback at once)
- 📱 Better mobile responsive design
- 🔔 Real-time notifications (WebSocket/Pusher)
- 📎 Better attachment preview/download

## Files Created

**Database:**
- `supabase-admin-setup.sql` - Admin role setup

**Auth:**
- `lib/supabase/admin-auth.ts` - Admin authentication helpers

**Email:**
- `lib/email/resend-client.ts` - Resend client and email functions

**Admin:**
- `app/admin/feedback/page.tsx` - Admin page (server component)
- `app/admin/feedback/admin-feedback-client.tsx` - Admin client component
- `app/api/admin/feedback/route.ts` - Admin API endpoints

**Updates:**
- `app/api/feedback/route.ts` - Added email triggers
- `components/layout/navbar.tsx` - Added admin check
- `components/layout/navbar-client.tsx` - Added admin link

---

**Ready to manage feedback!** 🎉
