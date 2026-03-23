'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/contratos', label: 'Contratos', icon: '📄' },
  { href: '/liquidaciones', label: 'Liquidaciones', icon: '💰' },
  { href: '/permisos', label: 'Permisos', icon: '📅' },
  { href: '/cartola', label: 'Cartola', icon: '📊' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
  { href: '/facturacion', label: 'Facturación', icon: '💳' },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full bg-gesti-teal text-white">
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/contratos" className="flex items-center gap-2">
          <Image
            src="https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png"
            alt="Gesti"
            width={80}
            height={32}
            className="h-8 w-auto"
            unoptimized
          />
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-white/80 hover:text-white text-xl">
            ✕
          </button>
        )}
      </div>

      {/* Nav Links */}
      <ul className="flex-1 px-2 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-white/20 font-semibold'
                    : 'hover:bg-white/10'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="p-4 text-xs text-white/50">
        Gesti v3.1
      </div>
    </nav>
  )
}
