"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import type { Tables } from "@/types/supabase";

type SavedRecipe = Tables<'saved_recipes'>;

interface EditRecipeDialogProps {
  recipe: SavedRecipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedRecipe: Partial<SavedRecipe>) => Promise<void>;
}

export function EditRecipeDialog({
  recipe,
  open,
  onOpenChange,
  onSave,
}: EditRecipeDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Reset form when recipe changes
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || "");
      setNotes(recipe.notes || "");
      setPrepTime(recipe.prep_time_minutes?.toString() || "");
      setCookTime(recipe.cook_time_minutes?.toString() || "");
      setServings(recipe.servings?.toString() || "");
      setDifficulty(recipe.difficulty || "");
      setTags(recipe.tags || []);
    }
  }, [recipe]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!recipe) return;

    setIsSaving(true);
    try {
      const updates: Partial<SavedRecipe> = {
        title,
        notes,
        prep_time_minutes: prepTime ? parseInt(prepTime) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime) : null,
        servings: servings ? parseInt(servings) : null,
        difficulty,
        tags,
      };

      await onSave(updates);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving recipe:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
          <DialogDescription>
            Update recipe details and add personal notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Recipe Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter recipe title"
            />
          </div>

          {/* Personal Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Personal Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your personal cooking tips, modifications, or notes..."
              rows={4}
            />
          </div>

          {/* Time and Servings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (min)</Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook Time (min)</Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleAddTag}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
