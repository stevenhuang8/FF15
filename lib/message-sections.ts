/**
 * Message Section Utilities
 *
 * Splits an AI response into header-delimited sections so that extractors can work on
 * only the part of a message that is relevant to them (e.g. a reply that contains both
 * a workout plan and a recipe).
 */

export type SectionKind = 'recipe' | 'workout' | 'none';

export interface MessageSection {
  heading: string | null;
  kind: SectionKind;
  text: string; // Heading line + body
}

// Markdown headers (# - ###) or a standalone bold line (**Title** / **Title:**)
const HEADER_PATTERN = /^(?:#{1,3}\s+.+|\*\*[^*]+\*\*:?)$/;

const RECIPE_HEADING_PATTERN =
  /\b(recipes?|meals?|fuel\w*|eat|eats|bowls?|breakfast|lunch|dinner|snacks?|ingredients?|instructions|directions|smoothies?|shakes?|food|cook\w*)\b/gi;

const WORKOUT_HEADING_PATTERN =
  /\b(workouts?|training|exercises?|routines?|program|lifts?|gym|day\s*\d+|warm-?up|cool-?down|circuits?)\b/gi;

function cleanHeading(line: string): string {
  return line.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').replace(/:$/, '').trim();
}

/**
 * Classifies a heading as recipe, workout, or neutral based on its keywords
 */
function classifyHeading(heading: string): SectionKind {
  // "Pre-workout snack" / "Post-workout meal" are food, not workouts
  const forWorkoutScore = heading.replace(/\b(?:pre|post)[\s-]?workout\b/gi, '');

  const recipeScore = heading.match(RECIPE_HEADING_PATTERN)?.length ?? 0;
  const workoutScore = forWorkoutScore.match(WORKOUT_HEADING_PATTERN)?.length ?? 0;

  if (recipeScore > workoutScore) return 'recipe';
  if (workoutScore > recipeScore) return 'workout';
  return 'none';
}

/**
 * Splits text into sections at each header line. Sections with a neutral heading
 * (e.g. "Ingredients" under a recipe, "Progression" under a workout) inherit the
 * kind of the closest preceding classified section.
 */
export function splitMessageSections(text: string): MessageSection[] {
  const lines = text.split('\n');
  const sections: MessageSection[] = [];

  let current: { heading: string | null; kind: SectionKind; lines: string[] } = {
    heading: null,
    kind: 'none',
    lines: [],
  };
  let lastKind: SectionKind = 'none';

  const pushCurrent = () => {
    const sectionText = current.lines.join('\n').trim();
    if (sectionText.length > 0) {
      sections.push({ heading: current.heading, kind: current.kind, text: sectionText });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (HEADER_PATTERN.test(trimmed)) {
      pushCurrent();
      const heading = cleanHeading(trimmed);
      const classified = classifyHeading(heading);
      const kind: SectionKind = classified === 'none' ? lastKind : classified;
      lastKind = kind;
      current = { heading, kind, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  pushCurrent();

  return sections;
}

/**
 * Returns only the parts of a message that belong to the given kind.
 * Only narrows when the message clearly contains both a recipe and a workout;
 * otherwise the full text is returned unchanged.
 */
function getSectionText(text: string, kind: Exclude<SectionKind, 'none'>): string {
  const sections = splitMessageSections(text);
  const kinds = new Set(sections.map(s => s.kind));

  if (!kinds.has('recipe') || !kinds.has('workout')) {
    return text;
  }

  const matching = sections.filter(s => s.kind === kind);
  return matching.length > 0 ? matching.map(s => s.text).join('\n\n') : text;
}

export function getRecipeSection(text: string): string {
  return getSectionText(text, 'recipe');
}

export function getWorkoutSection(text: string): string {
  return getSectionText(text, 'workout');
}
