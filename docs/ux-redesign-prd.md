# Product Requirements Document: UX/UI Redesign & Mobile Polish

## 1. Overview

### Purpose
Improve usability and visual polish of the Food & Fitness AI app across web and mobile. The landing page (`/`) already has a modern glass-morphism / animated-gradient design using a warm sand & stone-blue palette, but this design language and a coherent navigation structure do not carry through to the rest of the application.

### Problem Statement
A UX audit identified the following issues:
- `/` is a marketing/agent-picker page shown even to logged-in users; there is no auth-aware redirect, so logged-in users land back on a "choose your agent" screen when they click the logo.
- "FF Coach" (`/simple-agent`, the primary AI chat) is not present in the main navbar (`components/layout/navbar-client.tsx`) and is only discoverable via the landing page or buried under "History".
- Two separate full-page chat experiences exist (`/simple-agent` and `/chat-history`) with overlapping purpose.
- `/about` and `/agent-with-mcp-tools` are leftover starter-template / dev pages with no real polish (`/about` literally describes itself as "This starter showcases a minimal AI chat interface").
- Pages duplicate navigation affordances, e.g. the Recipes page has its own "Back to Chat" button even though the navbar already provides navigation.
- Visual design is inconsistent: the `.glass`, `.glass-strong`, `.animated-gradient`, and `.glow-hover` utilities from `app/globals.css` are only used on the landing page. Internal pages (dashboard, recipes, ingredients, nutrition, workouts, profile) use plain default shadcn `Card` components on a flat background with inconsistent container/spacing conventions (`py-8` vs `py-10`, `max-w-7xl` vs `max-w-4xl`).
- Loading states are plain text (e.g. "Loading dashboard…", "Loading conversation…") with no skeleton placeholders; no `Skeleton` component is installed.
- Chat error handling uses native `alert()` popups in `components/chat/chat-assistant.tsx` (roughly 5 separate alerts) instead of a toast system; no `sonner` or similar toast library is installed.
- The Workouts page "Edit" button (`app/workouts/workouts-page-client.tsx`) is a no-op stub that only logs to the console.
- `components/chat/conversation-list.tsx` uses inline pixel-width styles (`style={{ maxWidth: '384px' }}`) instead of Tailwind classes.
- There is no bottom tab navigation for mobile; the only mobile nav is a hamburger menu with 6+ items plus a conditional Admin item. PWA support (manifest, icons, generate-icons script) was recently added but the UI does not yet feel like a native installed app, and full-height chat layouts use `h-screen` instead of `h-dvh`, which can cause viewport jumpiness in mobile Safari.

### Success Metrics
- Logged-in users visiting `/` land in the app (FF Coach or dashboard), not the marketing/agent-picker page; the marketing page remains for logged-out visitors only.
- FF Coach chat is reachable from a single, consistent place via the main navigation on every page.
- Chat history and the main chat UI are merged into one experience (no duplicate full-page chat routes).
- All primary app pages (dashboard, recipes, nutrition, workouts, ingredients, profile) share a consistent page header, container, and card styling that reflects the landing page's visual language.
- Loading states use skeleton placeholders matching the underlying layout.
- No native `alert()` calls remain for chat error handling; errors are surfaced via toast notifications.
- The Workouts "Edit" button performs a real edit action.
- A bottom tab navigation bar is available on small screens for the primary sections of the app.
- `pnpm tsc --noEmit` passes with no errors after each phase.

## 2. Target Users
Existing authenticated users of the Food & Fitness AI app (home cooks, meal planners, fitness enthusiasts) who use the app on both desktop browsers and mobile devices, including as an installed PWA.

## 3. Scope

### Phase 1 - Navigation & Information Architecture (Priority)
- Add an auth-aware redirect so logged-in users visiting `/` land on FF Coach (or dashboard) instead of the marketing/agent-picker landing page. Logged-out visitors continue to see the current landing page.
- Add "FF Coach" as a primary item in `components/layout/navbar-client.tsx` (desktop nav and mobile menu).
- Merge `/simple-agent` and `/chat-history` into a single chat route/experience with a collapsible or toggleable conversation history sidebar (reusing `components/chat/conversation-list.tsx` and `components/chat/chat-assistant.tsx`), removing the duplicate full-page chat route.
- Remove the redundant "Back to Chat" button from the Recipes page (`app/recipes/page.tsx`) since the navbar already provides navigation.
- Remove `/about` and `/agent-with-mcp-tools` from any primary navigation/landing links, either deleting them or clearly repurposing them as secondary/dev-only pages.
- Update navbar nav items list and mobile dropdown to reflect the new structure.

### Phase 2 - Visual Design System Unification
- Extend the glass-morphism / gradient / sand-blue design language (`.glass`, `.glass-strong`, `.animated-gradient`, `.glow-hover` from `app/globals.css`) from the landing page into in-app surfaces such as page headers, cards, and dialogs.
- Create shared `PageHeader` and `PageContainer` components encapsulating a consistent title/description/primary-action layout and consistent container width/padding, and apply them across the dashboard, recipes, nutrition, workouts, ingredients, and profile pages, replacing the current per-page ad-hoc headers and container classes.
- Install the shadcn `Skeleton` component and use it for loading states on the dashboard, recipe/workout lists, ingredient list, and conversation list/chat history loading.

### Phase 3 - Interaction Polish
- Install and configure `sonner` for toast notifications and replace all `alert()` calls in `components/chat/chat-assistant.tsx` (streaming errors, tool errors, payload-too-large errors, generic failures) with toast notifications that match the app's visual style.
- Implement the Workouts "Edit" action (`app/workouts/workouts-page-client.tsx`), which currently only logs to the console, with a working edit dialog/flow consistent with existing edit patterns (e.g. `components/recipe/edit-recipe-dialog.tsx`).
- Audit empty states across recipes, ingredients, workouts, and conversation list, and ensure each has a friendly icon, message, and call-to-action where one is missing.
- Replace inline pixel-width styles in `components/chat/conversation-list.tsx` with Tailwind utility classes.

### Phase 4 - Mobile-First Pass
- Add a bottom tab navigation bar shown on small screens for primary sections (Chat, Dashboard, Recipes, Nutrition, Workouts), with a "More" entry for secondary sections (Pantry, Profile, Admin).
- Replace the hamburger dropdown menu on mobile with the new bottom tab bar (keep hamburger only if needed for secondary items not in the bottom bar).
- Replace `h-screen` with `h-dvh` in full-height chat and page layouts (e.g. `app/simple-agent/page.tsx`, merged chat page) to avoid mobile browser viewport jumpiness.
- Audit touch target sizes and safe-area insets (notches/home indicators) for the new bottom navigation, given the recently added PWA manifest and icons.

## 4. Out of Scope
- Backend/data model or Supabase schema changes.
- New AI agent features, tools, or subagents (tracked separately as existing pending tasks 13-17).
- A new color palette or rebrand - reuse the existing sand/stone-blue palette and glass/gradient utilities consistently rather than introducing new visual styles.

## 5. Technical Considerations
- Follow CLAUDE.md conventions: use pnpm exclusively, and run `pnpm tsc --noEmit` after each meaningful change.
- All chat UI changes must continue to follow the `useChat` / `sendMessage({ text })` / `parts` array patterns documented in CLAUDE.md and `components/chat/CLAUDE.md`.
- Reuse existing `glass`, `glass-strong`, `animated-gradient`, and `glow-hover` utility classes from `app/globals.css` rather than introducing new ad-hoc styles.
- New shadcn components required: `skeleton`, and a toast system (`sonner`) added via `pnpm dlx shadcn@latest add ...`.
- Framer Motion is already used on the landing page and navbar; reuse it for new animated components (page transitions, bottom nav, etc.) for consistency.
