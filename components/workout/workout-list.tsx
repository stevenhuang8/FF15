"use client";

import { useState } from "react";
import { WorkoutCard } from "./workout-card";
import { Button } from "@/components/ui/button";
import { Grid3x3, List, Loader2 } from "lucide-react";
import type { Tables } from "@/types/supabase";

type SavedWorkout = Tables<'workout_plans'>;

interface WorkoutListProps {
  workouts: SavedWorkout[];
  isLoading?: boolean;
  hasActiveFilters?: boolean;
  onEdit?: (workout: SavedWorkout) => void;
  onDelete?: (workout: SavedWorkout) => void;
  onWorkoutClick?: (workout: SavedWorkout) => void;
}

export function WorkoutList({
  workouts,
  isLoading,
  hasActiveFilters = false,
  onEdit,
  onDelete,
  onWorkoutClick,
}: WorkoutListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground mb-2">
          {hasActiveFilters ? 'No workouts match your filters' : 'No workouts saved yet'}
        </p>
        <p className="text-sm text-muted-foreground max-w-md">
          {hasActiveFilters
            ? 'Try adjusting your search query or filters to see more results.'
            : 'Start a conversation with the AI and ask for a workout plan. When you see a workout, click the "Save Workout" button to add it to your collection.'}
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

      {/* Workout Grid/List */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'flex flex-col gap-4'
        }
      >
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onWorkoutClick}
          />
        ))}
      </div>
    </div>
  );
}
