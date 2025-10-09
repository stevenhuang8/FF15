import { createClient } from './client'

export async function testSupabaseConnection() {
  const supabase = createClient()

  try {
    // Test 1: Simple query to check connection
    const { data, error } = await supabase
      .from('exercises')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Supabase connection test failed:', error.message)
      return false
    }

    console.log('✅ Supabase connection successful!')
    console.log('📊 Database is accessible')

    // Test 2: Check if RLS is enabled (should fail without auth)
    const { error: userProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)

    if (userProfileError) {
      console.log('✅ Row Level Security is working (unauthorized access blocked)')
    } else {
      console.log('⚠️  Warning: RLS might not be properly configured')
    }

    return true
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

// Export types for use in the app
export type { Database } from '../../types/supabase'
