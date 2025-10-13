"use client";

import { useEffect, useState, useMemo } from "react";
import { RecipeList } from "@/components/recipe/recipe-list";
import { RecipeFilters, type RecipeFiltersState } from "@/components/recipe/recipe-filters";
import { getRecipes } from "@/lib/supabase/recipes";
import { createClient } from "@/lib/supabase/client";
import { filterRecipes, sortRecipes, extractAllTags } from "@/lib/recipe-filters";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/types/supabase";

type SavedRecipe = Tables<'saved_recipes'>;

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecipeFiltersState>({
    searchQuery: "",
    selectedTags: [],
    sortBy: "date-desc",
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Please log in to view your recipes');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await getRecipes(user.id);

      if (fetchError) {
        console.error('Error loading recipes:', fetchError);
        setError('Failed to load recipes');
      } else if (data) {
        setRecipes(data);
      }
    } catch (err) {
      console.error('Exception loading recipes:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  const handleEdit = (recipe: SavedRecipe) => {
    // TODO: Implement edit functionality in next subtask
    console.log('Edit recipe:', recipe.id);
  };

  const handleDelete = async (recipe: SavedRecipe) => {
    // TODO: Implement delete with confirmation in next subtask
    console.log('Delete recipe:', recipe.id);
  };

  const handleRecipeClick = (recipe: SavedRecipe) => {
    // TODO: Implement recipe detail view in next subtask
    console.log('View recipe:', recipe.id);
  };

  // Extract available tags from all recipes
  const availableTags = useMemo(() => extractAllTags(recipes), [recipes]);

  // Apply filters and sorting
  const filteredAndSortedRecipes = useMemo(() => {
    const filtered = filterRecipes(recipes, filters);
    const sorted = sortRecipes(filtered, filters.sortBy);
    return sorted;
  }, [recipes, filters]);

  const handleFiltersChange = (newFilters: RecipeFiltersState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      selectedTags: [],
      sortBy: "date-desc",
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.selectedTags.length > 0 ||
    filters.dateRange?.from !== undefined ||
    filters.sortBy !== "date-desc";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Recipes</h1>
          <p className="text-muted-foreground mt-1">
            {filteredAndSortedRecipes.length === recipes.length
              ? `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'} saved`
              : `Showing ${filteredAndSortedRecipes.length} of ${recipes.length} recipes`}
          </p>
        </div>
        <Link href="/">
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      {!error && !isLoading && recipes.length > 0 && (
        <div className="mb-6">
          <RecipeFilters
            availableTags={availableTags}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
          />
        </div>
      )}

      {/* Recipe List */}
      <RecipeList
        recipes={filteredAndSortedRecipes}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRecipeClick={handleRecipeClick}
      />
    </div>
  );
}
