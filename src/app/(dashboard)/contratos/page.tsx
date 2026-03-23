'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Search } from 'lucide-react'
import { ContractCard } from '@/components/dashboard/ContractCard'
import { Button } from '@/components/ui/button'
import type { Contrato, EstadoContrato } from '@/lib/types/contrato'

const ESTADO_FILTERS: { value: EstadoContrato | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'generado', label: 'Generado' },
  { value: 'activo', label: 'Activo' },
  { value: 'terminado', label: 'Terminado' },
]

export default function ContratosPage() {
  const router = useRouter()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<EstadoContrato | 'todos'>('todos')

  useEffect(() => {
    async function fetchContratos() {
      try {
        const res = await fetch('/api/contratos')
        const data = await res.json()
        if (data.success) {
          setContratos(data.data ?? [])
        }
      } catch {
        // API not ready yet — show empty state
      } finally {
        setIsLoading(false)
      }
    }
    fetchContratos()
  }, [])

  // Filter
  const filtered = contratos.filter((c) => {
    if (estadoFilter !== 'todos' && c.estado !== estadoFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const haystack = `${c.nombre_trabajador} ${c.apellidos_trabajador} ${c.razon_social}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gesti-verde/10 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-gesti-verde" />
        </div>
        <h2 className="text-xl font-semibold text-gesti-dark mb-2">
          Sin contratos aún
        </h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Crea tu primer contrato de trabajo para tu trabajador/a de casa particular.
        </p>
        <Link href="/contratos/nuevo">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Crear contrato
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-gesti-dark">Contratos</h1>
        <Link href="/contratos/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo contrato
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
          />
        </div>

        {/* Estado filter */}
        <div className="flex gap-1.5 flex-wrap">
          {ESTADO_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEstadoFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                estadoFilter === f.value
                  ? 'bg-gesti-teal text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">
          No se encontraron contratos con ese filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((contrato) => (
            <ContractCard
              key={contrato.id}
              contrato={contrato}
              onEdit={() => router.push(`/contratos/${contrato.id}`)}
              onGeneratePDF={() => {
                // TODO: rama-c implementa PDF generation
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
