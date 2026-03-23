'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tipo: 'info' | 'warning' | 'success' | 'error'
  leida: boolean
  created_at: string
}

const iconByTipo = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notificaciones')
        const data = await res.json()
        if (data.success) {
          setNotificaciones(data.data ?? [])
        }
      } catch {
        // silent
      }
    }
    fetchNotifications()
  }, [])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notificaciones.filter((n) => !n.leida).length

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notificaciones/${id}/read`, { method: 'POST' })
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      )
    } catch {
      // silent
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-500 hover:text-gesti-teal transition-colors p-1"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gesti-dark">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-400">{unreadCount} sin leer</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Sin notificaciones
              </div>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.leida && markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !n.leida ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{iconByTipo[n.tipo]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gesti-dark truncate">{n.titulo}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                    </div>
                    {!n.leida && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
