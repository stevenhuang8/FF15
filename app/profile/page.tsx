import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/profile-form'
import { DietaryPreferencesForm } from '@/components/dietary/dietary-preferences-form'
import { Separator } from '@/components/ui/separator'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-2xl space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your dietary preferences, fitness goals, and daily nutrition targets
          </p>
        </div>

        <ProfileForm profile={profile} />

        <Separator />

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dietary Preferences & Allergies</h2>
            <p className="text-muted-foreground mt-1">
              Set your dietary restrictions and allergies to get personalized, safe recipe recommendations
            </p>
          </div>
          <DietaryPreferencesForm />
        </div>
      </div>
    </div>
  )
}
