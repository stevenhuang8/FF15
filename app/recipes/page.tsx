"use client";

import { useEffect, useState, useMemo } from "react";
import { RecipeList } from "@/components/recipe/recipe-list";
import { RecipeFilters, type RecipeFiltersState } from "@/components/recipe/recipe-filters";
import { RecipeDetailDialog } from "@/components/recipe/recipe-detail-dialog";
import { EditRecipeDialog } from "@/components/recipe/edit-recipe-dialog";
import { DeleteRecipeDialog } from "@/components/recipe/delete-recipe-dialog";
import { getRecipes, updateRecipe, deleteRecipe } from "@/lib/supabase/recipes";
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

  // Dialog states
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleRecipeClick = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe);
    setDetailDialogOpen(true);
  };

  const handleEdit = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe);
    setEditDialogOpen(true);
  };

  const handleDelete = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async (updates: Partial<SavedRecipe>) => {
    if (!selectedRecipe) return;

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('Please log in to edit recipes');
        return;
      }

      const { error: updateError } = await updateRecipe(
        selectedRecipe.id,
        user.id,
        updates
      );

      if (updateError) {
        console.error('Error updating recipe:', updateError);
        alert('Failed to update recipe');
        return;
      }

      // Update local state
      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === selectedRecipe.id
            ? { ...recipe, ...updates }
            : recipe
        )
      );

      console.log('✅ Recipe updated successfully');
    } catch (error) {
      console.error('Exception updating recipe:', error);
      alert('Failed to update recipe');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRecipe) return;

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('Please log in to delete recipes');
        return;
      }

      const { error: deleteError } = await deleteRecipe(
        selectedRecipe.id,
        user.id
      );

      if (deleteError) {
        console.error('Error deleting recipe:', deleteError);
        alert('Failed to delete recipe');
        return;
      }

      // Update local state
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== selectedRecipe.id));
      setDeleteDialogOpen(false);
      setDetailDialogOpen(false);
      setSelectedRecipe(null);

      console.log('✅ Recipe deleted successfully');
    } catch (error) {
      console.error('Exception deleting recipe:', error);
      alert('Failed to delete recipe');
    }
  };

  const handleEditFromDetail = () => {
    setDetailDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleDeleteFromDetail = () => {
    setDetailDialogOpen(false);
    setDeleteDialogOpen(true);
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

      {/* Recipe Detail Dialog */}
      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

      {/* Edit Recipe Dialog */}
      <EditRecipeDialog
        recipe={selectedRecipe}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteRecipeDialog
        recipe={selectedRecipe}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
