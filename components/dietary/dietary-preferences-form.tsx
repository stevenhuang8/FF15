'use client'

/**
 * DietaryPreferencesForm Component
 *
 * Form for managing dietary restrictions and allergies
 */

import { useState, useEffect } from 'react'
import { X, Plus, Loader2, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { createClient } from '@/lib/supabase/client'
import { updateDietaryRestrictions, updateAllergies } from '@/lib/supabase/substitutions'

// ============================================================================
// Common Options
// ============================================================================

const COMMON_DIETARY_RESTRICTIONS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'keto',
  'paleo',
  'low-carb',
  'low-fat',
  'halal',
  'kosher',
]

const COMMON_ALLERGENS = [
  'peanuts',
  'tree nuts',
  'milk',
  'eggs',
  'wheat',
  'soy',
  'fish',
  'shellfish',
  'sesame',
]

// ============================================================================
// Component
// ============================================================================

interface DietaryPreferencesFormProps {
  onSuccess?: () => void
}

export function DietaryPreferencesForm({ onSuccess }: DietaryPreferencesFormProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [customRestriction, setCustomRestriction] = useState('')
  const [customAllergen, setCustomAllergen] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ============================================================================
  // Load User Data
  // ============================================================================

  useEffect(() => {
    async function loadUserData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)

        // Load existing preferences
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('dietary_restrictions, allergies')
          .eq('id', user.id)
          .single()

        if (profile) {
          setDietaryRestrictions(profile.dietary_restrictions || [])
          setAllergies(profile.allergies || [])
        }
      }

      setIsLoading(false)
    }

    loadUserData()
  }, [])

  // ============================================================================
  // Handlers
  // ============================================================================

  const toggleDietaryRestriction = (restriction: string) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter((r) => r !== restriction))
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction])
    }
  }

  const toggleAllergen = (allergen: string) => {
    if (allergies.includes(allergen)) {
      setAllergies(allergies.filter((a) => a !== allergen))
    } else {
      setAllergies([...allergies, allergen])
    }
  }

  const addCustomRestriction = () => {
    const trimmed = customRestriction.trim().toLowerCase()
    if (trimmed && !dietaryRestrictions.includes(trimmed)) {
      setDietaryRestrictions([...dietaryRestrictions, trimmed])
      setCustomRestriction('')
    }
  }

  const addCustomAllergen = () => {
    const trimmed = customAllergen.trim().toLowerCase()
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed])
      setCustomAllergen('')
    }
  }

  const removeDietaryRestriction = (restriction: string) => {
    setDietaryRestrictions(dietaryRestrictions.filter((r) => r !== restriction))
  }

  const removeAllergen = (allergen: string) => {
    setAllergies(allergies.filter((a) => a !== allergen))
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setSaveSuccess(false)

    try {
      const supabase = createClient()

      // Update both in parallel
      const [restrictionsResult, allergiesResult] = await Promise.all([
        updateDietaryRestrictions(supabase, userId, dietaryRestrictions),
        updateAllergies(supabase, userId, allergies),
      ])

      if (restrictionsResult.error || allergiesResult.error) {
        console.error('Error saving preferences:', {
          restrictions: restrictionsResult.error,
          allergies: allergiesResult.error,
        })
        return
      }

      setSaveSuccess(true)

      setTimeout(() => {
        onSuccess?.()
      }, 1000)
    } catch (error) {
      console.error('Exception saving preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dietary Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Restrictions</CardTitle>
          <CardDescription>
            Select your dietary preferences to get personalized recipe recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Common Options */}
          <div className="flex flex-wrap gap-2">
            {COMMON_DIETARY_RESTRICTIONS.map((restriction) => (
              <Badge
                key={restriction}
                variant={
                  dietaryRestrictions.includes(restriction) ? 'default' : 'outline'
                }
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => toggleDietaryRestriction(restriction)}
              >
                {restriction}
              </Badge>
            ))}
          </div>

          {/* Custom Restriction Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add custom restriction..."
              value={customRestriction}
              onChange={(e) => setCustomRestriction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomRestriction()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addCustomRestriction}
              disabled={!customRestriction.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Restrictions */}
          {dietaryRestrictions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Restrictions:</Label>
              <div className="flex flex-wrap gap-2">
                {dietaryRestrictions.map((restriction) => (
                  <Badge key={restriction} className="flex items-center gap-1">
                    {restriction}
                    <button
                      onClick={() => removeDietaryRestriction(restriction)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle>Allergies</CardTitle>
          <CardDescription>
            List your food allergies to automatically filter out unsafe recipes and ingredients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Common Allergens */}
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map((allergen) => (
              <Badge
                key={allergen}
                variant={allergies.includes(allergen) ? 'destructive' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => toggleAllergen(allergen)}
              >
                {allergen}
              </Badge>
            ))}
          </div>

          {/* Custom Allergen Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add custom allergen..."
              value={customAllergen}
              onChange={(e) => setCustomAllergen(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomAllergen()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addCustomAllergen}
              disabled={!customAllergen.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Allergies */}
          {allergies.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-red-600 dark:text-red-400">
                Your Allergies:
              </Label>
              <div className="flex flex-wrap gap-2">
                {allergies.map((allergen) => (
                  <Badge key={allergen} variant="destructive" className="flex items-center gap-1">
                    {allergen}
                    <button
                      onClick={() => removeAllergen(allergen)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {allergies.length > 0 && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong> Recipes and ingredients will be automatically filtered
              based on your allergies. Always verify ingredients before consuming.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || saveSuccess} size="lg">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saveSuccess && <CheckCircle2 className="mr-2 h-4 w-4" />}
          {saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      {saveSuccess && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-200">
          Dietary preferences saved successfully! Your recipe recommendations will now be
          personalized.
        </div>
      )}
    </div>
  )
}
