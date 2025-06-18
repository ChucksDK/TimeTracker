import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()

  return NextResponse.json({
    authenticated: !!session,
    user: session?.user?.email,
    error: error?.message,
    cookies: {
      'sb-access-token': !!cookieStore.get('sb-qucpkdeflimilelkmoqz-auth-token'),
    }
  })
}