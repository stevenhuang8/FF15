'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { IngredientCard } from './ingredient-card'
import type { Ingredient, IngredientCategory } from '@/types/ingredient'

interface IngredientListProps {
  ingredients: Ingredient[]
  onEdit?: (ingredient: Ingredient) => void
  onDelete?: (ingredientId: string) => void
  isLoading?: boolean
}

type SortOption = 'name-asc' | 'name-desc' | 'expiry-asc' | 'expiry-desc' | 'quantity-asc' | 'quantity-desc'
type ExpiryFilter = 'all' | 'expired' | 'expiring-soon' | 'fresh'

export function IngredientList({
  ingredients,
  onEdit,
  onDelete,
  isLoading = false,
}: IngredientListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory | 'all'>('all')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')

  // Get unique categories from ingredients
  const categories = useMemo(() => {
    const cats = new Set(ingredients.map(i => i.category).filter(Boolean))
    return Array.from(cats) as IngredientCategory[]
  }, [ingredients])

  // Helper function to determine expiry status
  const getExpiryStatus = (expiryDate: Date | null | undefined): ExpiryFilter => {
    if (!expiryDate) return 'all'

    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'expired'
    if (diffDays <= 3) return 'expiring-soon'
    if (diffDays <= 7) return 'fresh'
    return 'all'
  }

  // Filter and sort ingredients
  const filteredAndSortedIngredients = useMemo(() => {
    let filtered = ingredients

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (ingredient) =>
          ingredient.name.toLowerCase().includes(query) ||
          ingredient.category?.toLowerCase().includes(query) ||
          ingredient.notes?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((ingredient) => ingredient.category === categoryFilter)
    }

    // Expiry filter
    if (expiryFilter !== 'all') {
      filtered = filtered.filter((ingredient) => {
        const status = getExpiryStatus(ingredient.expiryDate)
        return status === expiryFilter
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'expiry-asc': {
          if (!a.expiryDate) return 1
          if (!b.expiryDate) return -1
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        }
        case 'expiry-desc': {
          if (!a.expiryDate) return 1
          if (!b.expiryDate) return -1
          return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
        }
        case 'quantity-asc':
          return a.quantity - b.quantity
        case 'quantity-desc':
          return b.quantity - a.quantity
        default:
          return 0
      }
    })

    return sorted
  }, [ingredients, searchQuery, sortBy, categoryFilter, expiryFilter])

  // Count ingredients by expiry status
  const expiryStats = useMemo(() => {
    return {
      expired: ingredients.filter(i => getExpiryStatus(i.expiryDate) === 'expired').length,
      expiringSoon: ingredients.filter(i => getExpiryStatus(i.expiryDate) === 'expiring-soon').length,
      total: ingredients.length,
    }
  }, [ingredients])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <Package className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading ingredients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      {ingredients.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{ingredients.length} total</span>
          {expiryStats.expiringSoon > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                {expiryStats.expiringSoon} expiring soon
              </span>
            </>
          )}
          {expiryStats.expired > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-red-600 dark:text-red-400 font-medium">
                {expiryStats.expired} expired
              </span>
            </>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="expiry-asc">Expiry (earliest)</SelectItem>
            <SelectItem value="expiry-desc">Expiry (latest)</SelectItem>
            <SelectItem value="quantity-asc">Quantity (low)</SelectItem>
            <SelectItem value="quantity-desc">Quantity (high)</SelectItem>
          </SelectContent>
        </Select>

        {/* Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="sr-only">Filters</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Filters</h4>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category-filter" className="text-sm">
                  Category
                </Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as IngredientCategory | 'all')}
                >
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Filter */}
              <div className="space-y-2">
                <Label htmlFor="expiry-filter" className="text-sm">
                  Expiry Status
                </Label>
                <Select
                  value={expiryFilter}
                  onValueChange={(value) => setExpiryFilter(value as ExpiryFilter)}
                >
                  <SelectTrigger id="expiry-filter">
                    <SelectValue placeholder="All items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All items</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="expiring-soon">Expiring soon</SelectItem>
                    <SelectItem value="fresh">Fresh (within week)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {(categoryFilter !== 'all' || expiryFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter('all')
                    setExpiryFilter('all')
                  }}
                  className="w-full"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Ingredient Grid */}
      {filteredAndSortedIngredients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedIngredients.map((ingredient) => (
            <IngredientCard
              key={ingredient.id}
              ingredient={ingredient}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No ingredients found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || categoryFilter !== 'all' || expiryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add ingredients to your inventory to get started'}
          </p>
        </div>
      )}
    </div>
  )
}
