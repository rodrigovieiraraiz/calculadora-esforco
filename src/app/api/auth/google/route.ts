import { NextRequest, NextResponse } from 'next/server'
import { buildGoogleAuthUrl } from '@/lib/google-oauth'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    // Use a random state value to prevent CSRF
    const state = crypto.randomUUID()

    const authUrl = buildGoogleAuthUrl(redirectUri, state)

    const response = NextResponse.redirect(authUrl)
    // Store state in a short-lived cookie for validation in callback
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    })

    return response
  } catch (error) {
    console.error('[GET /api/auth/google]', error)
    return NextResponse.redirect(new URL('/login?error=oauth_init_failed', request.url))
  }
}
