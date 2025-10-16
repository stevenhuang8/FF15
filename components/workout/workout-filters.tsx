"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, X, SlidersHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export type WorkoutSortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "duration-asc" | "duration-desc";
export type WorkoutCategory = "strength" | "cardio" | "hiit" | "flexibility" | "mixed";
export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced";

export interface WorkoutFiltersState {
  searchQuery: string;
  selectedCategories: WorkoutCategory[];
  selectedDifficulties: WorkoutDifficulty[];
  dateRange?: DateRange;
  sortBy: WorkoutSortOption;
}

interface WorkoutFiltersProps {
  filters: WorkoutFiltersState;
  onFiltersChange: (filters: WorkoutFiltersState) => void;
  onReset: () => void;
}

const CATEGORIES: { value: WorkoutCategory; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "flexibility", label: "Flexibility" },
  { value: "mixed", label: "Mixed" },
];

const DIFFICULTIES: { value: WorkoutDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function WorkoutFilters({
  filters,
  onFiltersChange,
  onReset,
}: WorkoutFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleSortChange = (value: WorkoutSortOption) => {
    onFiltersChange({ ...filters, sortBy: value });
  };

  const toggleCategory = (category: WorkoutCategory) => {
    const newCategories = filters.selectedCategories.includes(category)
      ? filters.selectedCategories.filter((c) => c !== category)
      : [...filters.selectedCategories, category];
    onFiltersChange({ ...filters, selectedCategories: newCategories });
  };

  const toggleDifficulty = (difficulty: WorkoutDifficulty) => {
    const newDifficulties = filters.selectedDifficulties.includes(difficulty)
      ? filters.selectedDifficulties.filter((d) => d !== difficulty)
      : [...filters.selectedDifficulties, difficulty];
    onFiltersChange({ ...filters, selectedDifficulties: newDifficulties });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.selectedCategories.length > 0 ||
    filters.selectedDifficulties.length > 0 ||
    filters.dateRange?.from ||
    filters.sortBy !== "date-desc";

  return (
    <div className="space-y-4">
      {/* Search Bar and Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workouts, exercises..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="duration-asc">Shortest first</SelectItem>
            <SelectItem value="duration-desc">Longest first</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={isFiltersOpen ? "bg-accent" : ""}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Advanced Filters */}
      {isFiltersOpen && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {/* Category Filters */}
          <div>
            <h3 className="text-sm font-medium mb-2">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Badge
                  key={category.value}
                  variant={filters.selectedCategories.includes(category.value) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-accent capitalize"
                  onClick={() => toggleCategory(category.value)}
                >
                  {category.label}
                  {filters.selectedCategories.includes(category.value) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Difficulty Filters */}
          <div>
            <h3 className="text-sm font-medium mb-2">Filter by Difficulty</h3>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((difficulty) => (
                <Badge
                  key={difficulty.value}
                  variant={filters.selectedDifficulties.includes(difficulty.value) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-accent capitalize"
                  onClick={() => toggleDifficulty(difficulty.value)}
                >
                  {difficulty.label}
                  {filters.selectedDifficulties.includes(difficulty.value) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <h3 className="text-sm font-medium mb-2">Filter by Date Saved</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.from}
                  selected={filters.dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.searchQuery && (
            <Badge variant="secondary">
              Search: {filters.searchQuery}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => handleSearchChange("")}
              />
            </Badge>
          )}
          {filters.selectedCategories.map((category) => (
            <Badge key={category} variant="secondary" className="capitalize">
              Category: {category}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => toggleCategory(category)}
              />
            </Badge>
          ))}
          {filters.selectedDifficulties.map((difficulty) => (
            <Badge key={difficulty} variant="secondary" className="capitalize">
              Difficulty: {difficulty}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => toggleDifficulty(difficulty)}
              />
            </Badge>
          ))}
          {filters.dateRange?.from && (
            <Badge variant="secondary">
              Date:{" "}
              {filters.dateRange.to
                ? `${format(filters.dateRange.from, "MMM d")} - ${format(
                    filters.dateRange.to,
                    "MMM d"
                  )}`
                : format(filters.dateRange.from, "MMM d")}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => handleDateRangeChange(undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
