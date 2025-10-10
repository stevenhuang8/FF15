'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/types/supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  dietary_restrictions: z.string().optional(),
  allergies: z.string().optional(),
  fitness_goals: z.string().optional(),
  daily_calorie_target: z.union([z.number().int().min(0), z.string()]).optional().nullable(),
  daily_protein_target: z.union([z.number().int().min(0), z.string()]).optional().nullable(),
  daily_carbs_target: z.union([z.number().int().min(0), z.string()]).optional().nullable(),
  daily_fats_target: z.union([z.number().int().min(0), z.string()]).optional().nullable(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

type ProfileData = {
  full_name?: string
  dietary_restrictions?: string
  allergies?: string
  fitness_goals?: string
  daily_calorie_target?: number | null
  daily_protein_target?: number | null
  daily_carbs_target?: number | null
  daily_fats_target?: number | null
}

interface ProfileFormProps {
  profile: UserProfile | null
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      dietary_restrictions: profile?.dietary_restrictions?.join(', ') || '',
      allergies: profile?.allergies?.join(', ') || '',
      fitness_goals: profile?.fitness_goals?.join(', ') || '',
      daily_calorie_target: profile?.daily_calorie_target || null,
      daily_protein_target: profile?.daily_protein_target || null,
      daily_carbs_target: profile?.daily_carbs_target || null,
      daily_fats_target: profile?.daily_fats_target || null,
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    try {
      setError(null)
      setSuccess(false)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Convert comma-separated strings to arrays
      const dietary_restrictions = data.dietary_restrictions
        ? data.dietary_restrictions.split(',').map(s => s.trim()).filter(Boolean)
        : []
      const allergies = data.allergies
        ? data.allergies.split(',').map(s => s.trim()).filter(Boolean)
        : []
      const fitness_goals = data.fitness_goals
        ? data.fitness_goals.split(',').map(s => s.trim()).filter(Boolean)
        : []

      // Convert string inputs to numbers
      const parseNumber = (val: number | string | null | undefined): number | null => {
        if (val === null || val === undefined || val === '') return null
        const num = typeof val === 'string' ? Number(val) : val
        return isNaN(num) ? null : num
      }

      const profileData = {
        id: user.id,
        email: user.email!,
        full_name: data.full_name || null,
        dietary_restrictions,
        allergies,
        fitness_goals,
        daily_calorie_target: parseNumber(data.daily_calorie_target),
        daily_protein_target: parseNumber(data.daily_protein_target),
        daily_carbs_target: parseNumber(data.daily_carbs_target),
        daily_fats_target: parseNumber(data.daily_fats_target),
        updated_at: new Date().toISOString(),
      }

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(profileData)

      if (upsertError) {
        throw upsertError
      }

      setSuccess(true)
      router.refresh()

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update profile. Please try again.')
      }
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Manage your personal information and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dietary_restrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Restrictions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="vegetarian, vegan, gluten-free (comma-separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter dietary restrictions separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="peanuts, shellfish, dairy (comma-separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter allergies separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fitness_goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="weight loss, muscle gain, maintenance (comma-separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter fitness goals separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="daily_calorie_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Calories</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2000"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>kcal/day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daily_protein_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Protein</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="150"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>grams/day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daily_carbs_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Carbs</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="200"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>grams/day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daily_fats_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Fats</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="70"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>grams/day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                Profile updated successfully!
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
