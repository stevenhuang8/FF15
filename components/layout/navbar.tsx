import { getUser } from '@/lib/supabase/auth-server'
import { UserMenu } from '@/components/auth/user-menu'
import { NavbarClient } from './navbar-client'

export async function Navbar() {
  const user = await getUser()

  return (
    <NavbarClient
      user={user}
      userMenuComponent={user ? <UserMenu user={user} /> : null}
    />
  )
}
