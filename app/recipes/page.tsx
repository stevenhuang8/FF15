"use client";

import { useEffect, useState } from "react";
import { RecipeList } from "@/components/recipe/recipe-list";
import { getRecipes } from "@/lib/supabase/recipes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/types/supabase";

type SavedRecipe = Tables<'saved_recipes'>;

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Recipes</h1>
          <p className="text-muted-foreground mt-1">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} saved
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

      {/* Recipe List */}
      <RecipeList
        recipes={recipes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRecipeClick={handleRecipeClick}
      />
    </div>
  );
}
