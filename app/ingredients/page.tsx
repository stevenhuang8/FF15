'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { IngredientInput } from '@/components/ingredient/ingredient-input'
import { IngredientList } from '@/components/ingredient/ingredient-list'
import { IngredientEditDialog } from '@/components/ingredient/ingredient-edit-dialog'
import type { Ingredient, IngredientInput as IngredientInputType } from '@/types/ingredient'

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Edit dialog state
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Fetch ingredients
  const fetchIngredients = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ingredients')

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view your ingredients')
        }
        throw new Error('Failed to fetch ingredients')
      }

      const data = await response.json()
      const fetchedIngredients: Ingredient[] = data.ingredients || []

      // Convert snake_case to camelCase
      const formattedIngredients: Ingredient[] = fetchedIngredients.map(ing => ({
        id: ing.id,
        userId: (ing as any).user_id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        expiryDate: (ing as any).expiry_date ? new Date((ing as any).expiry_date) : null,
        category: ing.category,
        notes: ing.notes,
        createdAt: new Date((ing as any).created_at),
        updatedAt: new Date((ing as any).updated_at)
      }))

      setIngredients(formattedIngredients)
    } catch (err) {
      console.error('Error fetching ingredients:', err)
      setError(err instanceof Error ? err.message : 'Failed to load ingredients')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchIngredients()
  }, [fetchIngredients])

  // Handle add ingredient
  const handleAddIngredient = async (data: IngredientInputType) => {
    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          category: data.category || null,
          expiryDate: data.expiryDate || null,
          notes: data.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add ingredient')
      }

      // Refresh ingredients list
      await fetchIngredients()
    } catch (err) {
      console.error('Error adding ingredient:', err)
      setError(err instanceof Error ? err.message : 'Failed to add ingredient')
    } finally {
      setIsAdding(false)
    }
  }

  // Handle edit ingredient
  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient)
    setShowEditDialog(true)
  }

  // Handle save edited ingredient
  const handleSaveEdit = async (updatedIngredient: Ingredient) => {
    // Update local state optimistically
    setIngredients(prev =>
      prev.map(ing =>
        ing.id === updatedIngredient.id ? updatedIngredient : ing
      )
    )

    // Refresh to ensure consistency
    await fetchIngredients()
  }

  // Handle delete ingredient
  const handleDelete = async (ingredientId: string) => {
    try {
      const response = await fetch(`/api/ingredients/${ingredientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete ingredient')
      }

      // Remove from local state
      setIngredients(prev => prev.filter(ing => ing.id !== ingredientId))
    } catch (err) {
      console.error('Error deleting ingredient:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete ingredient')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Ingredient Inventory</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your ingredients and track expiry dates
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inventory">
              Inventory ({ingredients.length})
            </TabsTrigger>
            <TabsTrigger value="add">
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <IngredientList
              ingredients={ingredients}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Add Ingredient Tab */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Add New Ingredient</CardTitle>
                <CardDescription>
                  Fill in the details to add an ingredient to your inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IngredientInput
                  onSubmit={handleAddIngredient}
                  submitButtonText="Add to Inventory"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <IngredientEditDialog
          ingredient={editingIngredient}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={handleSaveEdit}
        />
      </div>
    </div>
  )
}
