import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
    }

    const response = NextResponse.json({ message: 'Logout realizado' })
    response.cookies.set('session_id', '', { httpOnly: true, path: '/', maxAge: 0 })
    return response
  } catch (error) {
    console.error('[POST /api/auth/logout]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
