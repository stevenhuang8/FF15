"use client";

import { Button } from "@/components/ui/button";
import { BookmarkPlus, Check, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { extractRecipe, validateRecipe } from "@/lib/recipe-extraction";
import { saveRecipe } from "@/lib/supabase/recipes";
import { createClient } from "@/lib/supabase/client";

interface SaveRecipeButtonProps {
  messageId: string;
  messageContent: string;
  conversationId?: string;
  onSave?: (messageId: string, content: string) => Promise<void>;
}

export function SaveRecipeButton({
  messageId,
  messageContent,
  conversationId,
  onSave,
}: SaveRecipeButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (isSaved || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      // Get current user
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Please log in to save recipes');
        return;
      }

      // Call the onSave callback if provided
      if (onSave) {
        await onSave(messageId, messageContent);
        setIsSaved(true);
        return;
      }

      // Extract recipe data from message content
      console.log('🔍 Extracting recipe from message:', messageId);
      const extractedRecipe = extractRecipe(messageContent);

      // Validate the extraction
      const validation = validateRecipe(extractedRecipe);
      console.log('📊 Recipe validation:', validation);

      if (!validation.isValid) {
        console.warn('⚠️ Recipe validation failed:', validation.errors);
        setError(`Recipe incomplete: ${validation.errors.join(', ')}`);
        return;
      }

      // Show warnings but continue
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Recipe warnings:', validation.warnings);
      }

      // Save to database
      console.log('💾 Saving recipe to database...');
      const { data, error: saveError } = await saveRecipe({
        recipe: extractedRecipe,
        userId: user.id,
        conversationId,
        messageId,
      });

      if (saveError) {
        console.error('❌ Failed to save recipe:', saveError);
        setError('Failed to save recipe. Please try again.');
        return;
      }

      console.log('✅ Recipe saved successfully:', data?.id);
      setIsSaved(true);

      // Keep saved state permanently (user can click again to update if needed)
    } catch (error) {
      console.error('❌ Exception saving recipe:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={isSaved ? "default" : error ? "destructive" : "outline"}
        size="sm"
        onClick={handleSave}
        disabled={isSaving}
        className="gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : isSaved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-4 w-4" />
            Try Again
          </>
        ) : (
          <>
            <BookmarkPlus className="h-4 w-4" />
            Save Recipe
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
