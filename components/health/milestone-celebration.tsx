'use client'

/**
 * MilestoneCelebration Component
 *
 * Displays celebration UI when users achieve milestones:
 * - Goal completion
 * - Weight milestones
 * - Workout streaks
 * - Consistency achievements
 */

import { useEffect, useState } from 'react'
import { Trophy, Star, Zap, TrendingDown, Award, PartyPopper } from 'lucide-react'
import confetti from 'canvas-confetti'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// ============================================================================
// Types
// ============================================================================

export type MilestoneType =
  | 'goal_achieved'
  | 'weight_milestone'
  | 'workout_streak'
  | 'consistency'
  | 'first_metric'

export interface Milestone {
  type: MilestoneType
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface MilestoneCelebrationProps {
  milestone: Milestone
  open: boolean
  onClose: () => void
}

// ============================================================================
// Milestone Configurations
// ============================================================================

export const milestoneConfigs: Record<MilestoneType, Omit<Milestone, 'title' | 'description'>> = {
  goal_achieved: {
    type: 'goal_achieved',
    icon: Trophy,
    color: 'text-yellow-500',
  },
  weight_milestone: {
    type: 'weight_milestone',
    icon: TrendingDown,
    color: 'text-blue-500',
  },
  workout_streak: {
    type: 'workout_streak',
    icon: Zap,
    color: 'text-orange-500',
  },
  consistency: {
    type: 'consistency',
    icon: Star,
    color: 'text-purple-500',
  },
  first_metric: {
    type: 'first_metric',
    icon: Award,
    color: 'text-green-500',
  },
}

// ============================================================================
// Main Component
// ============================================================================

export function MilestoneCelebration({ milestone, open, onClose }: MilestoneCelebrationProps) {
  const Icon = milestone.icon

  useEffect(() => {
    if (open) {
      // Trigger confetti animation
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-bounce">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl">
            <PartyPopper className="inline h-6 w-6 mr-2" />
            {milestone.title}
            <PartyPopper className="inline h-6 w-6 ml-2" />
          </DialogTitle>
          <DialogDescription className="text-base">{milestone.description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center pt-4">
          <Button onClick={onClose} size="lg">
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Milestone Detector Hook
// ============================================================================

export function useMilestoneDetector() {
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  const checkMilestone = (type: MilestoneType, customTitle?: string, customDescription?: string) => {
    const config = milestoneConfigs[type]

    const newMilestone: Milestone = {
      ...config,
      title: customTitle || getDefaultTitle(type),
      description: customDescription || getDefaultDescription(type),
    }

    setMilestone(newMilestone)
    setShowCelebration(true)
  }

  const closeCelebration = () => {
    setShowCelebration(false)
  }

  return {
    milestone,
    showCelebration,
    checkMilestone,
    closeCelebration,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultTitle(type: MilestoneType): string {
  switch (type) {
    case 'goal_achieved':
      return 'Goal Achieved!'
    case 'weight_milestone':
      return 'Weight Milestone Reached!'
    case 'workout_streak':
      return 'Workout Streak!'
    case 'consistency':
      return 'Consistency Award!'
    case 'first_metric':
      return 'First Metric Logged!'
    default:
      return 'Milestone Achieved!'
  }
}

function getDefaultDescription(type: MilestoneType): string {
  switch (type) {
    case 'goal_achieved':
      return "Congratulations! You've achieved your fitness goal. Keep up the great work!"
    case 'weight_milestone':
      return "You've reached an important weight milestone. Your dedication is paying off!"
    case 'workout_streak':
      return "Amazing consistency! You're on a workout streak. Don't break it now!"
    case 'consistency':
      return "You've been consistently tracking your progress. That's the key to success!"
    case 'first_metric':
      return 'Great start! The first step is always the hardest. Keep logging your progress!'
    default:
      return "Great job! You've achieved something amazing!"
  }
}

// ============================================================================
// Milestone Progress Indicator
// ============================================================================

interface MilestoneProgressProps {
  current: number
  target: number
  label: string
  unit?: string
}

export function MilestoneProgress({ current, target, label, unit = '' }: MilestoneProgressProps) {
  const progress = Math.min((current / target) * 100, 100)
  const isComplete = progress >= 100

  return (
    <Card className={`p-4 ${isComplete ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {isComplete && <Trophy className="h-4 w-4 text-yellow-500" />}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {current.toFixed(1)} {unit}
          </span>
          <span>
            {target.toFixed(1)} {unit}
          </span>
        </div>
      </div>
    </Card>
  )
}
