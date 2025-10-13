import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, Edit, Trash2 } from "lucide-react";
import type { Tables } from "@/types/supabase";

type SavedRecipe = Tables<'saved_recipes'>;

interface RecipeCardProps {
  recipe: SavedRecipe;
  onEdit?: (recipe: SavedRecipe) => void;
  onDelete?: (recipe: SavedRecipe) => void;
  onClick?: (recipe: SavedRecipe) => void;
}

export function RecipeCard({ recipe, onEdit, onDelete, onClick }: RecipeCardProps) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <Card
      className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(recipe)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
            {recipe.difficulty && (
              <CardDescription className="mt-1">
                <Badge variant="outline" className="capitalize">
                  {recipe.difficulty}
                </Badge>
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Recipe Metadata */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
          {totalTime > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{totalTime} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
          {recipe.calories && (
            <div className="flex items-center gap-1">
              <ChefHat className="h-4 w-4" />
              <span>{recipe.calories} cal</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{recipe.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Ingredients Preview */}
        {ingredients.length > 0 && (
          <div className="text-sm">
            <p className="font-medium mb-1">Ingredients:</p>
            <p className="text-muted-foreground line-clamp-2">
              {ingredients.slice(0, 3).map((ing: any) => ing.item || ing).join(', ')}
              {ingredients.length > 3 && ` +${ingredients.length - 3} more`}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t">
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(recipe);
            }}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(recipe);
            }}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
