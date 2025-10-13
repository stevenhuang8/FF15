"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Users,
  ChefHat,
  MessageSquare,
  Edit,
  Trash2,
  Flame,
} from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/types/supabase";

type SavedRecipe = Tables<'saved_recipes'>;

interface RecipeDetailDialogProps {
  recipe: SavedRecipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: RecipeDetailDialogProps) {
  if (!recipe) return null;

  const totalTime =
    (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.title}</DialogTitle>
          <DialogDescription>
            Saved on {new Date(recipe.created_at || "").toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm">
              {totalTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{totalTime} min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{recipe.servings} servings</span>
                </div>
              )}
              {recipe.difficulty && (
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                  <span>{recipe.difficulty}</span>
                </div>
              )}
              {recipe.calories && (
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-muted-foreground" />
                  <span>{recipe.calories} cal</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Personal Notes */}
            {recipe.notes && (
              <>
                <div>
                  <h3 className="font-semibold mb-2">Personal Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {recipe.notes}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Ingredients */}
            <div>
              <h3 className="font-semibold mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {Array.isArray(recipe.ingredients) &&
                  recipe.ingredients.map((ing: any, index: number) => {
                    const ingredient =
                      typeof ing === "string"
                        ? ing
                        : `${ing.quantity || ""} ${ing.unit || ""} ${
                            ing.item || ""
                          }`.trim();
                    return (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{ingredient}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>

            <Separator />

            {/* Instructions */}
            <div>
              <h3 className="font-semibold mb-3">Instructions</h3>
              <ol className="space-y-3">
                {Array.isArray(recipe.instructions) &&
                  recipe.instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex gap-3">
                      <span className="font-semibold text-primary shrink-0">
                        {index + 1}.
                      </span>
                      <span className="text-sm">{instruction}</span>
                    </li>
                  ))}
              </ol>
            </div>

            {/* Nutrition Info */}
            {(recipe.calories || recipe.protein || recipe.carbs || recipe.fats) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Nutrition Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.calories && (
                      <div>
                        <div className="text-sm text-muted-foreground">Calories</div>
                        <div className="text-lg font-semibold">
                          {recipe.calories}
                        </div>
                      </div>
                    )}
                    {recipe.protein && (
                      <div>
                        <div className="text-sm text-muted-foreground">Protein</div>
                        <div className="text-lg font-semibold">{recipe.protein}g</div>
                      </div>
                    )}
                    {recipe.carbs && (
                      <div>
                        <div className="text-sm text-muted-foreground">Carbs</div>
                        <div className="text-lg font-semibold">{recipe.carbs}g</div>
                      </div>
                    )}
                    {recipe.fats && (
                      <div>
                        <div className="text-sm text-muted-foreground">Fats</div>
                        <div className="text-lg font-semibold">{recipe.fats}g</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Link to Source Conversation */}
            {recipe.conversation_id && (
              <>
                <Separator />
                <div>
                  <Link
                    href={`/chat-history?conversation=${recipe.conversation_id}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <MessageSquare className="h-4 w-4" />
                    View source conversation
                  </Link>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
