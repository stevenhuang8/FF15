"use client";

import { Button } from "@/components/ui/button";
import { Dumbbell, Check, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { extractWorkout, validateWorkout } from "@/lib/workout-extraction";
import { saveWorkout } from "@/lib/supabase/workouts";
import { createClient } from "@/lib/supabase/client";
import { isValidUUID } from "@/lib/utils";

interface SaveWorkoutButtonProps {
  messageId: string;
  messageContent: string;
  conversationId?: string;
  onSave?: (messageId: string, content: string) => Promise<void>;
}

export function SaveWorkoutButton({
  messageId,
  messageContent,
  conversationId,
  onSave,
}: SaveWorkoutButtonProps) {
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
        setError('Please log in to save workouts');
        return;
      }

      // Call the onSave callback if provided
      if (onSave) {
        await onSave(messageId, messageContent);
        setIsSaved(true);
        return;
      }

      // Extract workout data from message content
      console.log('🔍 Extracting workout from message:', messageId);
      const extractedWorkout = extractWorkout(messageContent);

      // Validate the extraction
      const validation = validateWorkout(extractedWorkout);
      console.log('📊 Workout validation:', validation);

      if (!validation.isValid) {
        console.warn('⚠️ Workout validation failed:', validation.errors);
        setError(`Workout incomplete: ${validation.errors.join(', ')}`);
        return;
      }

      // Show warnings but continue
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Workout warnings:', validation.warnings);
      }

      // Save to database
      console.log('💾 Saving workout to database...');
      const { data, error: saveError } = await saveWorkout({
        workout: extractedWorkout,
        userId: user.id,
        conversationId: isValidUUID(conversationId) ? conversationId : undefined,
        messageId: isValidUUID(messageId) ? messageId : undefined,
      });

      if (saveError) {
        console.error('❌ Failed to save workout:', saveError);
        setError('Failed to save workout. Please try again.');
        return;
      }

      console.log('✅ Workout saved successfully:', data?.id);
      setIsSaved(true);

      // Keep saved state permanently (user can click again to update if needed)
    } catch (error) {
      console.error('❌ Exception saving workout:', error);
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
            <Dumbbell className="h-4 w-4" />
            Save Workout
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
