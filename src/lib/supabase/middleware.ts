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
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, string | boolean | undefined> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // IMPORTANT: Do not write any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app
  // very slow as every request to your server will delay.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/contratos', '/liquidaciones', '/permisos', '/perfil', '/facturacion', '/cartola']
  const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and tries to access auth pages, redirect to dashboard
  const authPaths = ['/login', '/register']
  const isAuthRoute = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/contratos'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
