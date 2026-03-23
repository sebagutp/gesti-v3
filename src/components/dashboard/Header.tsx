'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { NotificationBell } from '@/components/shared/NotificationBell'

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName =
    user?.user_metadata?.name
      ? `${user.user_metadata.name} ${user.user_metadata.last_name || ''}`.trim()
      : user?.email || ''

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger for mobile */}
        <button
          onClick={onMenuToggle}
          className="md:hidden text-gesti-dark hover:text-gesti-teal"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gesti-dark hidden sm:block">
          Panel de Gestión
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <span className="text-sm text-gray-600 hidden sm:block">{displayName}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gesti-teal hover:text-gesti-teal/80 font-medium transition-colors"
          aria-label="Cerrar sesión"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
