'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Ingredient, IngredientUnit, IngredientCategory } from '@/types/ingredient'
import { INGREDIENT_UNITS, INGREDIENT_CATEGORIES } from '@/types/ingredient'
import { cn, formatDateForDB } from '@/lib/utils'

interface IngredientEditDialogProps {
  ingredient: Ingredient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (ingredient: Ingredient) => void
}

export function IngredientEditDialog({
  ingredient,
  open,
  onOpenChange,
  onSave,
}: IngredientEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<IngredientUnit>('g')
  const [category, setCategory] = useState<IngredientCategory | '' | 'none'>('')
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState('')

  // Populate form when ingredient changes
  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name)
      setQuantity(ingredient.quantity.toString())
      setUnit(ingredient.unit as IngredientUnit)
      setCategory((ingredient.category as IngredientCategory) || 'none')
      setExpiryDate(ingredient.expiryDate ? new Date(ingredient.expiryDate) : undefined)
      setNotes(ingredient.notes || '')
    } else {
      // Reset form
      setName('')
      setQuantity('')
      setUnit('g')
      setCategory('none')
      setExpiryDate(undefined)
      setNotes('')
    }
    setError(null)
  }, [ingredient, open])

  const handleSave = async () => {
    if (!ingredient) return

    // Validation
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const quantityNum = parseFloat(quantity)
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('Quantity must be a positive number')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/ingredients/${ingredient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          quantity: quantityNum,
          unit,
          category: category && category !== 'none' ? category : null,
          // Use formatDateForDB to save as YYYY-MM-DD in local timezone
          expiryDate: expiryDate ? formatDateForDB(expiryDate) : null,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update ingredient')
      }

      const { ingredient: updatedIngredient } = await response.json()
      onSave(updatedIngredient)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ingredient')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Ingredient</DialogTitle>
          <DialogDescription>
            Update the details of your ingredient
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., tomato, chicken breast"
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Enter quantity"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select value={unit} onValueChange={(value) => setUnit(value as IngredientUnit)}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as IngredientCategory | '')}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          <div className="grid gap-2">
            <Label htmlFor="expiry-date">Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="expiry-date"
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !expiryDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  initialFocus
                />
                {expiryDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpiryDate(undefined)}
                      className="w-full"
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {notes.length}/500 characters
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
