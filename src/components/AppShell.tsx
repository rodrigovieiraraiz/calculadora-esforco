'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4 pt-16 sm:p-6 lg:pt-6 transition-colors">
        {children}
      </main>
    </div>
  )
}
