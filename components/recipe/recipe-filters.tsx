"use client";

import { useState, useEffect } from "react";
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

export type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "time-asc" | "time-desc";

export interface RecipeFiltersState {
  searchQuery: string;
  selectedTags: string[];
  dateRange?: DateRange;
  sortBy: SortOption;
}

interface RecipeFiltersProps {
  availableTags: string[];
  filters: RecipeFiltersState;
  onFiltersChange: (filters: RecipeFiltersState) => void;
  onReset: () => void;
}

export function RecipeFilters({
  availableTags,
  filters,
  onFiltersChange,
  onReset,
}: RecipeFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleSortChange = (value: SortOption) => {
    onFiltersChange({ ...filters, sortBy: value });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.selectedTags.includes(tag)
      ? filters.selectedTags.filter((t) => t !== tag)
      : [...filters.selectedTags, tag];
    onFiltersChange({ ...filters, selectedTags: newTags });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.selectedTags.length > 0 ||
    filters.dateRange?.from ||
    filters.sortBy !== "date-desc";

  return (
    <div className="space-y-4">
      {/* Search Bar and Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recipes, ingredients..."
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
            <SelectItem value="time-asc">Quickest first</SelectItem>
            <SelectItem value="time-desc">Longest first</SelectItem>
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
          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Filter by Tags</h3>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {filters.selectedTags.includes(tag) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

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
          {filters.selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary">
              Tag: {tag}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => toggleTag(tag)}
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
