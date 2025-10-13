"use client";

import { useState } from "react";
import { RecipeCard } from "./recipe-card";
import { Button } from "@/components/ui/button";
import { Grid3x3, List, Loader2 } from "lucide-react";
import type { Tables } from "@/types/supabase";

type SavedRecipe = Tables<'saved_recipes'>;

interface RecipeListProps {
  recipes: SavedRecipe[];
  isLoading?: boolean;
  hasActiveFilters?: boolean;
  onEdit?: (recipe: SavedRecipe) => void;
  onDelete?: (recipe: SavedRecipe) => void;
  onRecipeClick?: (recipe: SavedRecipe) => void;
}

export function RecipeList({
  recipes,
  isLoading,
  hasActiveFilters = false,
  onEdit,
  onDelete,
  onRecipeClick,
}: RecipeListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground mb-2">
          {hasActiveFilters ? 'No recipes match your filters' : 'No recipes saved yet'}
        </p>
        <p className="text-sm text-muted-foreground max-w-md">
          {hasActiveFilters
            ? 'Try adjusting your search query or filters to see more results.'
            : 'Start a conversation with the AI and ask for a recipe. When you see a recipe, click the "Save Recipe" button to add it to your collection.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Recipe Grid/List */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'flex flex-col gap-4'
        }
      >
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onRecipeClick}
          />
        ))}
      </div>
    </div>
  );
}
