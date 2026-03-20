import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForTokens, fetchGoogleUserInfo, isAllowedDomain } from '@/lib/google-oauth'

export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)

  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      console.error('[GET /api/auth/google/callback] OAuth error from Google:', errorParam)
      loginUrl.searchParams.set('error', 'oauth_denied')
      return NextResponse.redirect(loginUrl)
    }

    if (!code || !state) {
      loginUrl.searchParams.set('error', 'oauth_invalid_response')
      return NextResponse.redirect(loginUrl)
    }

    // Validate CSRF state
    const savedState = request.cookies.get('oauth_state')?.value
    if (!savedState || savedState !== state) {
      console.error('[GET /api/auth/google/callback] State mismatch — possible CSRF')
      loginUrl.searchParams.set('error', 'oauth_state_mismatch')
      return NextResponse.redirect(loginUrl)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    const tokens = await exchangeCodeForTokens(code, redirectUri)
    const googleUser = await fetchGoogleUserInfo(tokens.access_token)

    if (!googleUser.verified_email) {
      loginUrl.searchParams.set('error', 'oauth_email_not_verified')
      return NextResponse.redirect(loginUrl)
    }

    if (!isAllowedDomain(googleUser.email)) {
      loginUrl.searchParams.set('error', 'oauth_domain_not_allowed')
      return NextResponse.redirect(loginUrl)
    }

    // Upsert user: match by googleId or email (for existing local accounts)
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.id }, { email: googleUser.email }],
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          nome: googleUser.name,
          googleId: googleUser.id,
          role: 'VIEWER',
          ativo: true,
        },
      })
    } else {
      // Link googleId to existing account if not yet linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.id },
        })
      }
    }

    if (!user.ativo) {
      loginUrl.searchParams.set('error', 'oauth_user_inactive')
      return NextResponse.redirect(loginUrl)
    }

    // Create session (7 days — same as email/password login)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt },
    })

    const response = NextResponse.redirect(new URL('/', request.url))

    // Clear the CSRF state cookie
    response.cookies.set('oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 })

    // sameSite: 'lax' required — 'strict' blocks the cookie when following a redirect
    // chain that originated from a cross-site domain (Google), causing the proxy to
    // not see the session cookie and redirect back to /login.
    response.cookies.set('session_id', session.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    return response
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/auth/google/callback]', error)
    loginUrl.searchParams.set('error', 'oauth_internal_error')
    loginUrl.searchParams.set('debug', msg)
    return NextResponse.redirect(loginUrl)
  }
}
