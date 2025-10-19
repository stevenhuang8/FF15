'use client'

/**
 * SubstitutionSuggestion Component
 *
 * Displays AI-generated ingredient substitution suggestions with context and explanations
 */

import { useState, useEffect } from 'react'
import { ArrowRight, Info, Star, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { createClient } from '@/lib/supabase/client'
import { getSuggestedSubstitutions, saveUserSubstitutionPreference } from '@/lib/supabase/substitutions'

// ============================================================================
// Types
// ============================================================================

interface SubstitutionOption {
  id?: string
  substitute_ingredient: string
  context: string | null
  reason: string | null
  ratio: string | null
  is_user_preference?: boolean
}

interface SubstitutionSuggestionProps {
  ingredient: string
  recipeContext?: 'baking' | 'cooking' | 'raw' | 'all'
  quantity?: string
  unit?: string
  onSelectSubstitution?: (substitute: string) => void
}

// ============================================================================
// Main Component
// ============================================================================

export function SubstitutionSuggestion({
  ingredient,
  recipeContext = 'all',
  quantity,
  unit,
  onSelectSubstitution,
}: SubstitutionSuggestionProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [substitutions, setSubstitutions] = useState<SubstitutionOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingPreference, setSavingPreference] = useState<string | null>(null)

  // ============================================================================
  // Load Substitutions
  // ============================================================================

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)

        // Get suggested substitutions
        const { data } = await getSuggestedSubstitutions(user.id, ingredient, recipeContext)
        if (data) {
          setSubstitutions(data as any)
        }
      }

      setIsLoading(false)
    }

    loadData()
  }, [ingredient, recipeContext])

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSaveAsPreference = async (substitute: string) => {
    if (!userId) return

    setSavingPreference(substitute)

    try {
      const { error } = await saveUserSubstitutionPreference({
        userId,
        originalIngredient: ingredient,
        preferredSubstitute: substitute,
        context: recipeContext === 'all' ? undefined : recipeContext,
      })

      if (!error) {
        // Reload substitutions to show the updated preference
        const { data } = await getSuggestedSubstitutions(userId, ingredient, recipeContext)
        if (data) {
          setSubstitutions(data as any)
        }
      }
    } catch (error) {
      console.error('Error saving preference:', error)
    } finally {
      setSavingPreference(null)
    }
  }

  const handleSelect = (substitute: string) => {
    onSelectSubstitution?.(substitute)
  }

  const calculateQuantity = (ratio: string | null) => {
    if (!quantity || !unit || !ratio) return null

    const [num, denom] = ratio.split(':').map(Number)
    if (!num || !denom) return null

    const qty = parseFloat(quantity)
    if (isNaN(qty)) return null

    const newQty = (qty * num) / denom
    return `${newQty % 1 === 0 ? newQty : newQty.toFixed(2)} ${unit}`
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

  if (substitutions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Substitutions for {ingredient}</CardTitle>
          <CardDescription>
            No substitutions found. The AI can help suggest alternatives!
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Substitutions for {ingredient}
              {quantity && unit && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({quantity} {unit})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {recipeContext !== 'all' && `For ${recipeContext} context`}
            </CardDescription>
          </div>
          <Badge variant="outline">{recipeContext}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {substitutions.map((sub, index) => {
          const calculatedQty = calculateQuantity(sub.ratio)

          return (
            <div
              key={sub.id || index}
              className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${
                sub.is_user_preference
                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                  : 'hover:bg-accent'
              }`}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{sub.substitute_ingredient}</span>
                  {sub.is_user_preference && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Your Preference
                    </Badge>
                  )}
                </div>

                {sub.reason && (
                  <p className="text-sm text-muted-foreground">{sub.reason}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {sub.ratio && sub.ratio !== '1:1' && (
                    <span>
                      Ratio: {sub.ratio}
                      {calculatedQty && ` → ${calculatedQty}`}
                    </span>
                  )}
                  {calculatedQty && sub.ratio === '1:1' && (
                    <span>Use: {calculatedQty}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                {onSelectSubstitution && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelect(sub.substitute_ingredient)}
                        >
                          Use This
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Apply this substitution to the recipe</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {!sub.is_user_preference && userId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveAsPreference(sub.substitute_ingredient)}
                          disabled={savingPreference === sub.substitute_ingredient}
                        >
                          {savingPreference === sub.substitute_ingredient ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Star className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save as your preferred substitution</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )
        })}

        <div className="flex items-start gap-2 p-3 rounded-md bg-muted text-sm">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Substitution Tips:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {recipeContext === 'baking' && (
                <li>In baking, substitutions may affect texture and rise</li>
              )}
              {recipeContext === 'cooking' && (
                <li>Adjust cooking times and seasonings as needed</li>
              )}
              {recipeContext === 'raw' && <li>Consider flavor profiles when substituting</li>}
              <li>Test substitutions in small batches first</li>
              <li>Substitutions marked with a star are your saved preferences</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
