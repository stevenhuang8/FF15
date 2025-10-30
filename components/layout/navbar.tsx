import { getUser } from '@/lib/supabase/auth-server'
import { UserMenu } from '@/components/auth/user-menu'
import { NavbarClient } from './navbar-client'
import { isUserAdmin } from '@/lib/supabase/admin-auth'

export async function Navbar() {
  const user = await getUser()
  const isAdmin = user ? await isUserAdmin() : false

  return (
    <NavbarClient
      user={user}
      isAdmin={isAdmin}
      userMenuComponent={user ? <UserMenu user={user} /> : null}
    />
  )
}
