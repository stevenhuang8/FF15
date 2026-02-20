import { init } from '@launchdarkly/node-server-sdk'

let client: ReturnType<typeof init> | null = null

function getClient() {
  if (!client) client = init(process.env.LAUNCHDARKLY_SDK_KEY!)
  return client
}

export async function getFlag(
  key: string,
  defaultValue: boolean,
  attributes: Record<string, string> = {}
): Promise<boolean> {
  if (!process.env.LAUNCHDARKLY_SDK_KEY) return defaultValue
  try {
    const ld = getClient()
    await ld.waitForInitialization({ timeout: 5 })
    return await ld.variation(
      key,
      { kind: 'user', key: 'anonymous', anonymous: true, ...attributes },
      defaultValue
    )
  } catch {
    return defaultValue // never break the login page
  }
}
