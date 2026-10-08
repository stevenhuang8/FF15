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
