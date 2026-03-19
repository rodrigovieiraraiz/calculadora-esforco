'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavSection {
  title: string
  items: NavItem[]
}

// Sections visible to ALL users (including VIEWER)
const viewerSections: NavSection[] = [
  {
    title: 'Geral',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        label: 'Backlog',
        href: '/backlog',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        ),
      },
    ],
  },
]

// Sections visible ONLY to ADMIN
const adminOnlySections: NavSection[] = [
  {
    title: 'Parametrização',
    items: [
      {
        label: 'Áreas',
        href: '/areas',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        label: 'Componentes',
        href: '/componentes',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
      {
        label: 'Parametrização',
        href: '/parametrizacao',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Operação',
    items: [
      {
        label: 'Nova Solicitação',
        href: '/solicitacoes/nova',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    ],
  },
]

const adminSectionItems: NavItem[] = [
  {
    label: 'Usuários',
    href: '/admin/usuarios',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: 'Auditoria',
    href: '/auditoria',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
]

interface SessionUser {
  nome?: string
  email?: string
  role?: string
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCurrentUser(data)
      })
      .catch(() => {})
  }, [])

  const isAdmin = currentUser?.role === 'ADMIN'

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    router.push('/login')
  }

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const active = isActive(item.href)
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
              active
                ? 'bg-teal-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {item.icon}
            {item.label}
          </Link>
        </li>
      )
    })

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700">
        <Image src="/logo.jpg" alt="Raiz Educação" width={40} height={40} className="rounded-lg shrink-0" />
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-tight">
            <span className="text-orange-400">RAIZ</span>{' '}
            <span className="text-teal-400">educação</span>
          </span>
          <span className="text-gray-400 text-xs mt-0.5">Calculadora de Esforço</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Navegação principal">
        {viewerSections.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {section.title}
            </p>
            <ul>
              {renderNavItems(section.items)}
            </ul>
          </div>
        ))}

        {isAdmin && adminOnlySections.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {section.title}
            </p>
            <ul>
              {renderNavItems(section.items)}
            </ul>
          </div>
        ))}

        {isAdmin && (
          <div className="mb-6">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Administração
            </p>
            <ul>
              {renderNavItems(adminSectionItems)}
            </ul>
          </div>
        )}
      </nav>

      {/* User info */}
      {currentUser && (
        <div className="border-t border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-200 truncate">{currentUser.nome ?? currentUser.email}</p>
              {currentUser.role && (
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium mt-0.5 ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-teal-900/60 text-teal-300'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {currentUser.role}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <div className="border-t border-gray-700 px-4 py-3">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors mt-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-900 text-white"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mobileOpen}
        aria-controls="sidebar"
      >
        {mobileOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 flex flex-col bg-gray-900 h-screen
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {navContent}
      </aside>
    </>
  )
}
