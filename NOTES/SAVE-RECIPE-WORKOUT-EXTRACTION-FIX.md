# Save Recipe / Save Workout Extraction Fix

## Problem

When a single assistant reply contained **both** a workout and a recipe (e.g. "I want a workout to get a bigger butt and a recipe to fuel it"), both save buttons misbehaved:

1. **Save Workout saved more than the workout.** The saved workout included recipe ingredients ("6 oz cooked chicken", "1 cup cooked rice", …), progression notes, and sometimes took the recipe's header as its title ("Fueling meal (high-protein, glute-friendly)").
2. **Save Recipe failed** with `Recipe incomplete: No instructions found`.

### Root Cause

`SaveWorkoutButton` and `SaveRecipeButton` pass the **entire message text** to `extractWorkout()` / `extractRecipe()`. Neither extractor scoped itself to its own part of the message:

- The workout reply had no `Exercises:` header, so `extractExercises()` fell back to collecting **every** bulleted/numbered line in the message, including the recipe.
- The agent gave a compact recipe (bold dish name, one `a + b + c` ingredient bullet, `Approx macros:` and `Best timing:` bullets) with no `Instructions` section, and `validateRecipe()` treated missing instructions as a hard error.
- The bullet regex `^[-*•]` matched the leading `*` of `**bold**` lines, so bold titles and labels were parsed as list items (this is where the stray `*Chicken burrito bowl (1 serving)**` line came from).
- Macros written as `~510 kcal, 41g protein` didn't match the `protein: 41g`-only regexes.

---

## Fix

### 1. New helper: `lib/message-sections.ts`

- `splitMessageSections(text)` splits a reply at header lines (`#`–`###` or a standalone `**Bold**` line).
- Each heading is classified as `recipe` / `workout` / `none` by keyword (recipe, meal, fuel, bowl, ingredients… vs. workout, training, exercise, day N…). `pre-/post-workout` is stripped before scoring so "Post-workout meal" counts as food.
- Neutral headings (e.g. `**Ingredients**`, `**4 days/week:**`) inherit the kind of the previous classified section.
- `getRecipeSection()` / `getWorkoutSection()` return only the matching sections **only when the message contains both kinds**; otherwise the full text is returned unchanged, so single-topic messages behave exactly as before.

### 2. `lib/workout-extraction.ts`

- `extractWorkout()` now runs on `getWorkoutSection(text)` (title, category, metadata and `originalText` all come from the workout section only).
- Day-split lines are expanded into one exercise per comma-separated item, with the day label stored in `notes`:
  `Day 1 (Heavy thrust + hinge): Hip thrust 4×6–10, RDL 3×6–10, …` → `Hip thrust 4 × 6-10`, `RDL 3 × 6-10`, …
- New `SET_REP_PATTERN` parses `4×6–10`, `3x8-12/leg`, `2–3×12–20` (en/em dashes normalised to `-`). Set ranges are noted (`2-3 sets`).
- Commentary lines are skipped (`Progression:`, `Tip:`, `Note:`, `Rest:`, …, and lines ending in `?`).
- Name/details separator is now `:` or a spaced ` - `, so `Push-ups: 3x15` keeps its full name.

### 3. `lib/recipe-extraction.ts`

- `extractRecipe()` now runs on `getRecipeSection(text)`.
- Title prefers a standalone bold line directly under the header (the dish name) over a generic header like "Recipe to fuel glute growth"; `**` is stripped from titles.
- Labelled bullets are skipped as ingredients (`Approx macros:`, `Best timing:`, `Tips:`, `Swaps:`, …).
- `6 oz turkey + 1 cup rice + 1/2 cup salsa` is split on ` + ` into separate ingredients.
- Nutrition accepts both `protein: 41g` and `41g protein`, plus `510 kcal`. Servings also read `(1 serving)`, `serves 4`, `makes 6`.
- **Missing instructions is now a warning, not an error** — quick recipes save with ingredients + macros. Title and ingredients are still required.

### 4. Bullet regex (both extractors)

`^[-*•]` → `^(?:[-•]|\*(?!\*))` so a single `*` is a bullet but `**bold**` is not.

### 5. `components/agent/orchestrator-prompt.ts`

Added formatting guidance under **Response Quality Guidelines**: put a workout and a recipe under separate `##` headers, give recipes an **Ingredients** list and numbered **Instructions**, and list exercises one per line with sets x reps. This keeps future replies cleanly parseable; the extraction fixes don't depend on it.

**Unchanged:** `SaveRecipeButton`, `SaveWorkoutButton` and `chat-assistant.tsx` still pass the full message text — scoping happens inside the extractors.

---

## Verification

1. `pnpm tsc --noEmit` — passes
2. Scratch script running the extractors on the exact combined reply from the bug report:
   - Workout: title `Workout (build a bigger butt)`, 18 exercises (hip thrust, RDL, Bulgarian split squat, …), no recipe lines, valid
   - Recipe: title `Turkey Taco Rice Bowl + Greek Yogurt "crema" (1 serving)`, 4 ingredients (turkey, rice, salsa, Greek yogurt), 510 kcal / 41g protein / 50g carbs / 15g fat, servings 1, valid (warnings: no instructions, no time)
   - Regression: a normal recipe with `## Ingredients` / `## Instructions` and a normal `Exercises:` workout extract the same as before
3. Manual: `pnpm dev`, send "I would like a workout to get a bigger butt and a recipe to fuel my body to get a bigger butt", click both save buttons, and open the saved items to confirm their contents

---

## Known Limitations

- Items without a sets×reps scheme (e.g. `abduction drop-set 2 rounds`) save with sets but no reps.
- Recipes saved without instructions show an empty steps section in the recipe view.
- Section classification is keyword-based on headings; a reply with no headings at all falls back to whole-message parsing (previous behaviour).

---

## Follow-up 1: "View source conversation" opened a new chat

### Problem

The recipe and workout detail dialogs link to `/chat-history?conversation=<id>`, but `app/chat-history/page.tsx` never read the `conversation` query param — `selectedConversationId` always started as `null`, so `ChatAssistant` showed a new chat. Broken for both recipes and workouts.

### Fix (`app/chat-history/page.tsx`)

- Read `?conversation=` with `useSearchParams()` and use it as the initial selected conversation (`ChatAssistant` already loads history when given an id on mount).
- `useEffect` follows the param if it changes while the page is mounted.
- Selecting a conversation, starting a new chat, or creating one now updates the URL via `router.replace`, so refresh/share keeps the current conversation.
- Page content wrapped in `<Suspense>` (required for `useSearchParams` in Next.js 15+).

---

## Follow-up 2: Recipe saved with title "Ingredients" and steps listed as ingredients

### Problem

A curry reply with the headings `Recipe: Simple Chicken Curry (stovetop, serves ~4)`, `Ingredients`, `Instructions (35–45 min)`, `Avoid dry chicken` saved as:

- Title **"Ingredients"**
- Ingredients list containing every step and tip (split mid-sentence on ` + `) plus a `--` from the `---` rule
- Empty Instructions

### Root Cause

- Section headers were matched by exact string (`cleanedLine === 'instructions'`), so `Instructions (35–45 min)` was never recognised — ingredients never ended and instructions never started.
- The `Recipe:` title prefix only matched plain text, not `**Recipe:** X` / `### Recipe: X`; the title fallback then picked the `Ingredients` heading.
- Nothing ended the instructions section on a new heading like `**Avoid dry chicken**`.
- `^\d+[\.)]` treated the `1.` in `1.5 lb` as a list number (→ `5 lb`).

### Fix (`lib/recipe-extraction.ts`)

- New `normalizeHeaderName()` / `isSectionHeader()` compare headings after stripping markdown, a trailing colon (and inline content) and a trailing parenthetical, against `INGREDIENTS_HEADER_PATTERN`, `INSTRUCTIONS_HEADER_PATTERN` and `END_SECTION_HEADER_PATTERN` (notes, tips, nutrition, storage, …).
- Ingredients end at an instructions or end-section header; group headers inside (`**For the sauce:**`) are skipped.
- Instructions end at an end-section header, an ingredients header, any other standalone header (`**Avoid dry chicken**`) unless it's a group header, or a short plain line without punctuation.
- Title: `Recipe:`/`Title:` prefix matched after stripping `**` and `#`; the fallback skips section headings and horizontal rules.
- Horizontal rules (`---`, `***`) are ignored everywhere.
- Quantities accept decimals, mixed numbers, unicode fractions and ranges (`1.5`, `1 1/2`, `½`, `1–1¼`).
- ` + ` splitting ignores text in parentheses (`(or 1 tbsp curry powder + 1 tsp cumin)` stays as a note).
- `Optional:` / `Finish:` / `Garnish:` prefixes are kept as ingredient notes instead of being dropped.
- Servings also match `serves ~4`.
- List-number regex is now `^\d+[\.)](?!\d)` in both extractors, so `1.5 lb` is no longer read as item "1." + "5 lb".

### Verification

Scratch tests on the curry reply in three formats (plain text as rendered, `####` markdown headers, `**bold**` headers): every variant extracts the title `Simple Chicken Curry (stovetop, serves ~4)`, 11 ingredients (`1.5 lb boneless chicken thighs`, `1–1¼ tsp kosher salt`, optional cayenne, finishing lemon/lime), 7 steps, servings 4, and no tips. The earlier bigger-butt workout/recipe, pancake recipe and push-day workout tests are unchanged.
