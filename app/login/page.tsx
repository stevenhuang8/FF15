import { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { getFlag } from '@/lib/launchdarkly'

export const metadata: Metadata = {
  title: 'Sign In | Food & Fitness AI',
  description: 'Sign in to your Food & Fitness AI account',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const attributes: Record<string, string> = ref ? { ref } : {}
  const showDemo = await getFlag('demo-login', false, attributes)

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <LoginForm showDemo={showDemo} />
        <p className="px-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
