'use client'

/**
 * Nutrition Page Client Component
 *
 * Comprehensive nutrition dashboard with:
 * - Daily calorie and macro tracking
 * - Meal logging functionality
 * - Nutrition analytics and trends
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, TrendingUp, Apple } from 'lucide-react'

import { CalorieTracker } from '@/components/nutrition/calorie-tracker'
import { MealLogForm } from '@/components/nutrition/meal-log-form'
import { NutritionAnalytics } from '@/components/nutrition/nutrition-analytics'
import { TodaysMeals } from '@/components/nutrition/todays-meals'
import type { MealType } from '@/lib/nutrition/types'

export function NutritionPageClient() {
  const [mealDialogOpen, setMealDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('today')
  const [refreshKey, setRefreshKey] = useState(0)
  const [defaultMealType, setDefaultMealType] = useState<MealType | undefined>(undefined)

  const handleMealLogged = () => {
    setMealDialogOpen(false)
    setDefaultMealType(undefined)
    // Trigger refresh of calorie tracker and meals list
    setRefreshKey((prev) => prev + 1)
  }

  const handleLogMeal = (mealType?: MealType) => {
    setDefaultMealType(mealType)
    setMealDialogOpen(true)
  }

  const handleMealDeleted = () => {
    // Trigger refresh of calorie tracker and meals list
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nutrition</h1>
          <p className="text-muted-foreground">
            Track your meals and monitor your nutrition goals
          </p>
        </div>
        <Button onClick={() => handleLogMeal()} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Log Meal
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="today" className="gap-2">
            <Apple className="h-4 w-4" />
            Today
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          {/* Calorie Tracker Widget */}
          <CalorieTracker key={refreshKey} />

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">Quick Log Meal</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Track what you eat throughout the day
              </p>
              <Button onClick={() => handleLogMeal()} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Log a Meal
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">View Detailed Analytics</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                See trends and insights over time
              </p>
              <Button
                onClick={() => setActiveTab('analytics')}
                variant="outline"
                className="w-full"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </div>
          </div>

          {/* Today's Meals Summary */}
          <TodaysMeals
            refreshKey={refreshKey}
            onLogMeal={handleLogMeal}
            onMealDeleted={handleMealDeleted}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <NutritionAnalytics />
        </TabsContent>
      </Tabs>

      {/* Log Meal Dialog */}
      <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log a Meal</DialogTitle>
            <DialogDescription>
              Track what you eat with automatic nutritional calculations
            </DialogDescription>
          </DialogHeader>
          <MealLogForm
            onSuccess={handleMealLogged}
            onCancel={() => setMealDialogOpen(false)}
            defaultMealType={defaultMealType}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
