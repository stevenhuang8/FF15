'use client'

import { useState } from 'react'
import { MoreVertical, Edit, Trash2, Calendar, Package } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Ingredient } from '@/types/ingredient'
import { cn, formatPacificDate, parseLocalDate } from '@/lib/utils'

interface IngredientCardProps {
  ingredient: Ingredient
  onEdit?: (ingredient: Ingredient) => void
  onDelete?: (ingredientId: string) => void
}

/**
 * Get expiry status for an ingredient
 * Returns: 'expired' | 'expiring-soon' | 'fresh' | null
 */
function getExpiryStatus(expiryDate: Date | null | undefined): {
  status: 'expired' | 'expiring-soon' | 'fresh' | null
  daysUntilExpiry: number | null
} {
  if (!expiryDate) {
    return { status: null, daysUntilExpiry: null }
  }

  const now = new Date()
  // Parse YYYY-MM-DD strings as local dates to prevent timezone shift
  const expiry = typeof expiryDate === 'string' ? parseLocalDate(expiryDate) : expiryDate
  const diffTime = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { status: 'expired', daysUntilExpiry: diffDays }
  } else if (diffDays <= 3) {
    return { status: 'expiring-soon', daysUntilExpiry: diffDays }
  } else if (diffDays <= 7) {
    return { status: 'fresh', daysUntilExpiry: diffDays }
  }

  return { status: null, daysUntilExpiry: diffDays }
}

/**
 * Format expiry date for display
 */
function formatExpiryDate(expiryDate: Date | null | undefined): string {
  if (!expiryDate) return 'No expiry date'

  // Parse YYYY-MM-DD strings as local dates to prevent timezone shift
  const date = typeof expiryDate === 'string' ? parseLocalDate(expiryDate) : expiryDate
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
  } else if (diffDays === 0) {
    return 'Expires today'
  } else if (diffDays === 1) {
    return 'Expires tomorrow'
  } else if (diffDays <= 7) {
    return `Expires in ${diffDays} days`
  } else {
    return formatPacificDate(date, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

export function IngredientCard({ ingredient, onEdit, onDelete }: IngredientCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { status: expiryStatus, daysUntilExpiry } = getExpiryStatus(ingredient.expiryDate)
  const expiryText = formatExpiryDate(ingredient.expiryDate)

  const handleEdit = () => {
    if (onEdit) {
      onEdit(ingredient)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(ingredient.id)
    }
    setShowDeleteDialog(false)
  }

  return (
    <>
      <Card
        className={cn(
          'transition-all hover:shadow-md',
          expiryStatus === 'expired' && 'border-red-300 bg-red-50 dark:bg-red-950/20',
          expiryStatus === 'expiring-soon' && 'border-orange-300 bg-orange-50 dark:bg-orange-950/20'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg leading-none capitalize">
                {ingredient.name}
              </h3>
              {ingredient.category && (
                <Badge variant="secondary" className="text-xs">
                  {ingredient.category}
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Quantity */}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-bold">
              {ingredient.quantity}
            </span>
            <span className="text-lg text-muted-foreground">
              {ingredient.unit}
            </span>
          </div>

          {/* Expiry Date */}
          {ingredient.expiryDate && (
            <div
              className={cn(
                'flex items-center gap-2 text-sm',
                expiryStatus === 'expired' && 'text-red-600 dark:text-red-400 font-medium',
                expiryStatus === 'expiring-soon' && 'text-orange-600 dark:text-orange-400 font-medium',
                !expiryStatus && 'text-muted-foreground'
              )}
            >
              <Calendar className="h-4 w-4" />
              <span>{expiryText}</span>
            </div>
          )}

          {/* Notes */}
          {ingredient.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2 pt-1 border-t">
              {ingredient.notes}
            </p>
          )}

          {/* Expiry Warning Badge */}
          {expiryStatus === 'expired' && (
            <Badge variant="destructive" className="w-full justify-center">
              Expired
            </Badge>
          )}
          {expiryStatus === 'expiring-soon' && daysUntilExpiry !== null && (
            <Badge variant="outline" className="w-full justify-center border-orange-300 text-orange-700 dark:text-orange-400">
              Use within {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ingredient?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{ingredient.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
