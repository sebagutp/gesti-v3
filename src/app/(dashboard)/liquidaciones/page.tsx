'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Filter } from 'lucide-react'
import { LiquidacionTable } from '@/components/dashboard/LiquidacionTable'
import { Button } from '@/components/ui/button'
import type { Liquidacion } from '@/lib/types/liquidacion'
import type { Contrato } from '@/lib/types/contrato'

export default function LiquidacionesPage() {
  const router = useRouter()
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [periodoFilter, setPeriodoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')
  const [contratoFilter, setContratoFilter] = useState<string>('todos')

  useEffect(() => {
    async function fetchData() {
      try {
        const [liqRes, contRes] = await Promise.all([
          fetch('/api/liquidaciones'),
          fetch('/api/contratos'),
        ])
        const liqData = await liqRes.json()
        const contData = await contRes.json()

        if (liqData.success) setLiquidaciones(liqData.data ?? [])
        if (contData.success) setContratos(contData.data ?? [])
      } catch {
        // APIs not ready
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    return liquidaciones.filter((l) => {
      if (estadoFilter !== 'todos' && l.estado !== estadoFilter) return false
      if (contratoFilter !== 'todos' && l.contrato_id !== contratoFilter) return false
      if (periodoFilter && !l.periodo.includes(periodoFilter)) return false
      return true
    })
  }, [liquidaciones, estadoFilter, contratoFilter, periodoFilter])

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (liquidaciones.length === 0 && contratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gesti-verde/10 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-gesti-verde" />
        </div>
        <h2 className="text-xl font-semibold text-gesti-dark mb-2">Sin liquidaciones</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Para crear una liquidación primero necesitas un contrato activo.
        </p>
        <Link href="/contratos/nuevo">
          <Button>Crear contrato</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-gesti-dark">Liquidaciones</h1>
        {contratos.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={contratoFilter === 'todos' ? '' : contratoFilter}
              onChange={(e) => {
                const val = e.target.value
                setContratoFilter(val || 'todos')
              }}
              className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
            >
              <option value="">Todos los contratos</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_trabajador} {c.apellidos_trabajador}
                </option>
              ))}
            </select>
            {contratoFilter !== 'todos' && (
              <Link href={`/liquidaciones/nueva/${contratoFilter}`}>
                <Button size="sm">Nueva liquidación</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="month"
            value={periodoFilter}
            onChange={(e) => setPeriodoFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
            placeholder="Filtrar por período"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['todos', 'borrador', 'emitida', 'enviada', 'pagada'] as const).map((estado) => (
            <button
              key={estado}
              onClick={() => setEstadoFilter(estado)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                estadoFilter === estado
                  ? 'bg-gesti-teal text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {estado === 'todos' ? 'Todos' : estado.charAt(0).toUpperCase() + estado.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <LiquidacionTable
        liquidaciones={filtered}
        onEdit={(id) => router.push(`/liquidaciones/${id}`)}
        onDownloadPDF={() => {
          // TODO: rama-c PDF
        }}
      />
    </div>
  )
}
