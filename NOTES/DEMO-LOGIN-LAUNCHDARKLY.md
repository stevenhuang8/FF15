# Demo Login with LaunchDarkly Feature Flag

## Overview

Recruiters clicking the resume link `https://yourapp.com/login?ref=recruiter` see a "Continue as Demo" button on the login page. Everyone else sees the normal login form. The button is gated by a LaunchDarkly feature flag evaluated server-side using the `ref` query param as a context attribute.

---

## How It Works

```
Resume link: yourapp.com/login?ref=recruiter
                      │
                      ▼
        app/login/page.tsx (server component)
          reads searchParams.ref = "recruiter"
          calls getFlag('demo-login', false, { ref: 'recruiter' })
                      │
                      ▼
        LaunchDarkly Node SDK evaluates flag
          rule: if ref = "recruiter" → true
          default: false
                      │
             ┌────────┴────────┐
           true              false
             │                  │
     LoginForm renders     LoginForm renders
     demo button           normal form only
             │
             ▼
     User clicks "Continue as Demo"
             │
             ▼
     POST /api/auth/demo-login
     Supabase signInWithPassword(DEMO_EMAIL, DEMO_PASSWORD)
     Session cookies set automatically by Supabase SSR
             │
             ▼
     router.push('/') — user is in as demo account
```

---

## Files

| File | Role |
|------|------|
| `lib/launchdarkly.ts` | LD Node SDK singleton with graceful fallback |
| `app/api/auth/demo-login/route.ts` | POST handler — signs in as demo Supabase user |
| `app/login/page.tsx` | Reads `ref` param, evaluates flag, passes `showDemo` prop |
| `components/auth/login-form.tsx` | Renders demo button when `showDemo` is true |

---

## Environment Variables

```bash
# LaunchDarkly (server-side only — no NEXT_PUBLIC_ prefix)
LAUNCHDARKLY_SDK_KEY=sdk-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Demo Supabase account credentials
DEMO_EMAIL=demo@yourdomain.com
DEMO_PASSWORD=your_demo_password_here
```

---

## LaunchDarkly Dashboard Setup

1. Create account at launchdarkly.com
2. Create a new **boolean flag** — key must be exactly: `demo-login`
3. Go to **Project Settings → Environments** → copy the **Server-side SDK key** (not client-side ID)
4. Add a targeting rule to the flag:
   - **IF** `ref` **is one of** `recruiter` → serve `true`
   - **Default rule** → serve `false`
5. Enable targeting

### Kill Switch
To immediately hide the demo button everywhere (e.g. if abused): turn the flag **off** in the LD dashboard. No redeploy needed.

---

## Supabase Setup (one-time)

1. Go to Supabase Dashboard → Authentication → Users
2. Click **Add user** → **Create new user**
3. Enter the email and password matching `DEMO_EMAIL` / `DEMO_PASSWORD` in your env
4. The demo account is a real Supabase user — it can be given minimal data or a seeded dataset

---

## Resume Link

Put this on your resume / portfolio:

```
https://yourapp.com/login?ref=recruiter
```

Anyone clicking this link will see the "Continue as Demo" button. Anyone who types the URL directly will not.

---

## Security Notes

- Demo credentials live in server-only env vars — never exposed to the browser
- The LD SDK key has no `NEXT_PUBLIC_` prefix — server-side only
- RLS policies remain active for the demo user — same security boundary as real users
- You can scope the demo account's data by seeding specific rows tied to its user ID
