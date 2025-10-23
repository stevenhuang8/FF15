import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/profile-form'
import { DietaryPreferencesForm } from '@/components/dietary/dietary-preferences-form'
import { DeleteProfileButton } from '@/components/profile/delete-profile-button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="container mx-auto py-10 max-w-7xl">
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

        <Separator />

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that will permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <DeleteProfileButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
