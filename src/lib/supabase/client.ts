import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables:', {
      url: supabaseUrl,
      hasKey: !!supabaseKey
    })
    throw new Error('Supabase configuration is incomplete')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
