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
  Dumbbell,
  Activity,
  MessageSquare,
  Edit,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/types/supabase";

type SavedWorkout = Tables<'workout_plans'>;

interface WorkoutDetailDialogProps {
  workout: SavedWorkout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function WorkoutDetailDialog({
  workout,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: WorkoutDetailDialogProps) {
  if (!workout) return null;

  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

  // Get category badge variant
  const getCategoryVariant = (category: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (category) {
      case 'strength': return 'default';
      case 'cardio': return 'secondary';
      case 'hiit': return 'destructive';
      case 'flexibility': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{workout.title}</DialogTitle>
          <DialogDescription>
            Saved on {new Date(workout.created_at || "").toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Badge variant={getCategoryVariant(workout.category || 'mixed')} className="capitalize">
                {workout.category || 'mixed'}
              </Badge>
              {workout.difficulty && (
                <Badge variant="outline" className="capitalize">
                  {workout.difficulty}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {workout.estimated_duration_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{workout.estimated_duration_minutes} min</span>
                </div>
              )}
              {exercises.length > 0 && (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>{exercises.length} exercises</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            {workout.description && (
              <>
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {workout.description}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Exercises */}
            {exercises.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Exercises
                </h3>
                <div className="space-y-4">
                  {exercises.map((exercise: any, index: number) => {
                    const exerciseName = typeof exercise === "string"
                      ? exercise
                      : exercise.name || `Exercise ${index + 1}`;

                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="font-semibold text-primary shrink-0 text-lg">
                            {index + 1}.
                          </span>
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium text-base">{exerciseName}</h4>

                            {typeof exercise === "object" && exercise !== null && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                {exercise.sets && (
                                  <div>
                                    <span className="font-medium">Sets:</span> {exercise.sets}
                                  </div>
                                )}
                                {exercise.reps && (
                                  <div>
                                    <span className="font-medium">Reps:</span> {exercise.reps}
                                  </div>
                                )}
                                {exercise.duration && (
                                  <div>
                                    <span className="font-medium">Duration:</span> {exercise.duration}
                                  </div>
                                )}
                                {exercise.intensity && (
                                  <div>
                                    <span className="font-medium">Intensity:</span>{" "}
                                    <Badge variant="outline" className="capitalize text-xs">
                                      {exercise.intensity}
                                    </Badge>
                                  </div>
                                )}
                                {exercise.rest && (
                                  <div>
                                    <span className="font-medium">Rest:</span> {exercise.rest}
                                  </div>
                                )}
                              </div>
                            )}

                            {typeof exercise === "object" && exercise.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link to Source Conversation */}
            {workout.conversation_id && (
              <>
                <Separator />
                <div>
                  <Link
                    href={`/chat-history?conversation=${workout.conversation_id}`}
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
