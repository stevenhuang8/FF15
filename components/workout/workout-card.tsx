import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Dumbbell, Activity, Edit, Trash2 } from "lucide-react";
import type { Tables } from "@/types/supabase";

type SavedWorkout = Tables<'workout_plans'>;

interface WorkoutCardProps {
  workout: SavedWorkout;
  onEdit?: (workout: SavedWorkout) => void;
  onDelete?: (workout: SavedWorkout) => void;
  onClick?: (workout: SavedWorkout) => void;
}

export function WorkoutCard({ workout, onEdit, onDelete, onClick }: WorkoutCardProps) {
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
    <Card
      className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(workout)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-2">{workout.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Badge variant={getCategoryVariant(workout.category || 'mixed')} className="capitalize">
                {workout.category || 'mixed'}
              </Badge>
              {workout.difficulty && (
                <Badge variant="outline" className="capitalize">
                  {workout.difficulty}
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Workout Metadata */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
          {workout.estimated_duration_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{workout.estimated_duration_minutes} min</span>
            </div>
          )}
          {exercises.length > 0 && (
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span>{exercises.length} exercises</span>
            </div>
          )}
        </div>

        {/* Description */}
        {workout.description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {workout.description}
            </p>
          </div>
        )}

        {/* Exercises Preview */}
        {exercises.length > 0 && (
          <div className="text-sm">
            <p className="font-medium mb-1">Exercises:</p>
            <p className="text-muted-foreground line-clamp-2">
              {exercises.slice(0, 3).map((ex: any) => ex.name || ex).join(', ')}
              {exercises.length > 3 && ` +${exercises.length - 3} more`}
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
              onEdit(workout);
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
              onDelete(workout);
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
