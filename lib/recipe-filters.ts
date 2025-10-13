import type { Tables } from "@/types/supabase";
import type { RecipeFiltersState, SortOption } from "@/components/recipe/recipe-filters";
import { isWithinInterval, parseISO } from "date-fns";

type SavedRecipe = Tables<'saved_recipes'>;

/**
 * Filters recipes based on search query, tags, and date range
 */
export function filterRecipes(
  recipes: SavedRecipe[],
  filters: RecipeFiltersState
): SavedRecipe[] {
  let filtered = [...recipes];

  // Search filter (title, ingredients, notes)
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((recipe) => {
      // Search in title
      if (recipe.title?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in notes
      if (recipe.notes?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in ingredients
      if (Array.isArray(recipe.ingredients)) {
        const ingredientMatch = recipe.ingredients.some((ing: any) => {
          const item = typeof ing === 'string' ? ing : ing.item || '';
          return item.toLowerCase().includes(query);
        });
        if (ingredientMatch) return true;
      }

      // Search in tags
      if (Array.isArray(recipe.tags)) {
        const tagMatch = recipe.tags.some((tag: string) =>
          tag.toLowerCase().includes(query)
        );
        if (tagMatch) return true;
      }

      return false;
    });
  }

  // Tag filter
  if (filters.selectedTags.length > 0) {
    filtered = filtered.filter((recipe) => {
      if (!Array.isArray(recipe.tags)) return false;

      // Recipe must have ALL selected tags (AND logic)
      return filters.selectedTags.every((selectedTag) =>
        recipe.tags!.some((recipeTag: string) =>
          recipeTag.toLowerCase() === selectedTag.toLowerCase()
        )
      );
    });
  }

  // Date range filter
  if (filters.dateRange?.from) {
    filtered = filtered.filter((recipe) => {
      if (!recipe.created_at) return false;

      try {
        const recipeDate = parseISO(recipe.created_at);
        const fromDate = filters.dateRange!.from!;

        if (filters.dateRange!.to) {
          // Both from and to dates specified
          const toDate = filters.dateRange!.to;
          return isWithinInterval(recipeDate, {
            start: fromDate,
            end: toDate,
          });
        } else {
          // Only from date specified
          return recipeDate >= fromDate;
        }
      } catch (error) {
        console.error('Error parsing recipe date:', error);
        return false;
      }
    });
  }

  return filtered;
}

/**
 * Sorts recipes based on the selected sort option
 */
export function sortRecipes(
  recipes: SavedRecipe[],
  sortBy: SortOption
): SavedRecipe[] {
  const sorted = [...recipes];

  switch (sortBy) {
    case "date-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

    case "date-asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
      );

    case "name-asc":
      return sorted.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );

    case "name-desc":
      return sorted.sort((a, b) =>
        (b.title || "").localeCompare(a.title || "")
      );

    case "time-asc":
      return sorted.sort((a, b) => {
        const timeA =
          (a.prep_time_minutes || 0) + (a.cook_time_minutes || 0);
        const timeB =
          (b.prep_time_minutes || 0) + (b.cook_time_minutes || 0);
        return timeA - timeB;
      });

    case "time-desc":
      return sorted.sort((a, b) => {
        const timeA =
          (a.prep_time_minutes || 0) + (a.cook_time_minutes || 0);
        const timeB =
          (b.prep_time_minutes || 0) + (b.cook_time_minutes || 0);
        return timeB - timeA;
      });

    default:
      return sorted;
  }
}

/**
 * Extracts all unique tags from a list of recipes
 */
export function extractAllTags(recipes: SavedRecipe[]): string[] {
  const tagSet = new Set<string>();

  recipes.forEach((recipe) => {
    if (Array.isArray(recipe.tags)) {
      recipe.tags.forEach((tag: string) => {
        if (tag && typeof tag === 'string') {
          tagSet.add(tag);
        }
      });
    }
  });

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Highlights search query matches in text
 */
export function highlightSearchQuery(
  text: string,
  query: string
): string {
  if (!query) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Escapes special characters in a string for use in RegExp
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
