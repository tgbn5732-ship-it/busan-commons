import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Protect onboarding route (redirect to login if not authenticated)
  if (url.pathname.startsWith('/onboarding') && !user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in, check if they need to complete onboarding
  if (user) {
    // We fetch the profile to see if it's newly created with a default role
    // or if the user hasn't finished the onboarding steps.
    // Assuming 'citizen' with a default nickname is not enough if they need to explicitly submit the form.
    // Here we can check if their nickname starts with "user_" (the default in trigger) 
    // or if extra data is missing.
    // To avoid too many DB calls in middleware, a better approach might be checking a JWT claim if configured,
    // or just checking if they hit a protected route, then look up the profile.
    // For now, we allow access to /onboarding. If they are anywhere else, we might want to check DB.
    // We'll handle the detailed check inside page components for better performance, 
    // but a basic check can be done here if strictly required.
  }

  return supabaseResponse
}
