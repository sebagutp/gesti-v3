'use client'

import { useState, useMemo } from 'react'
import { Download, Send, Pencil, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCLP, formatPeriodo } from '@/lib/utils/format'
import type { Liquidacion } from '@/lib/types/liquidacion'

interface LiquidacionTableProps {
  liquidaciones: Liquidacion[]
  onEdit?: (id: string) => void
  onDownloadPDF?: (id: string) => void
  onSend?: (id: string) => void
  isLoading?: boolean
}

type SortKey = 'periodo' | 'bruto' | 'descuentos' | 'liquido' | 'estado'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

const estadoBadgeVariant: Record<string, 'borrador' | 'generado' | 'enviado' | 'activo'> = {
  borrador: 'borrador',
  calculada: 'generado',
  enviada: 'enviado',
  pagada: 'activo',
}

const estadoLabel: Record<string, string> = {
  borrador: 'Borrador',
  calculada: 'Calculada',
  enviada: 'Enviada',
  pagada: 'Pagada',
}

export function LiquidacionTable({
  liquidaciones,
  onEdit,
  onDownloadPDF,
  onSend,
  isLoading = false,
}: LiquidacionTableProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('periodo')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return liquidaciones
    const q = search.toLowerCase()
    return liquidaciones.filter(
      (l) =>
        l.periodo.includes(q) ||
        formatPeriodo(l.periodo).toLowerCase().includes(q) ||
        formatCLP(l.resultado.totales.liquido).includes(q)
    )
  }, [liquidaciones, search])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'periodo':
          cmp = a.periodo.localeCompare(b.periodo)
          break
        case 'bruto':
          cmp = a.resultado.totales.bruto - b.resultado.totales.bruto
          break
        case 'descuentos':
          cmp = a.resultado.totales.total_descuentos - b.resultado.totales.total_descuentos
          break
        case 'liquido':
          cmp = a.resultado.totales.liquido - b.resultado.totales.liquido
          break
        case 'estado':
          cmp = a.estado.localeCompare(b.estado)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="inline h-3.5 w-3.5 ml-1" />
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (liquidaciones.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg font-medium">Sin liquidaciones</p>
        <p className="text-sm mt-1">Las liquidaciones calculadas aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por período o monto..."
          aria-label="Buscar liquidaciones"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
        />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('periodo')}>
              Período <SortIcon column="periodo" />
            </TableHead>
            <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('bruto')}>
              Bruto <SortIcon column="bruto" />
            </TableHead>
            <TableHead className="cursor-pointer select-none text-right hidden sm:table-cell" onClick={() => handleSort('descuentos')}>
              Descuentos <SortIcon column="descuentos" />
            </TableHead>
            <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('liquido')}>
              Líquido <SortIcon column="liquido" />
            </TableHead>
            <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('estado')}>
              Estado <SortIcon column="estado" />
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((liq) => (
            <TableRow key={liq.id}>
              <TableCell className="font-medium">{formatPeriodo(liq.periodo)}</TableCell>
              <TableCell className="text-right">{formatCLP(liq.resultado.totales.bruto)}</TableCell>
              <TableCell className="text-right hidden sm:table-cell text-red-500">
                -{formatCLP(liq.resultado.totales.total_descuentos)}
              </TableCell>
              <TableCell className="text-right font-semibold text-gesti-teal">
                {formatCLP(liq.resultado.totales.liquido)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={estadoBadgeVariant[liq.estado] ?? 'borrador'}>
                  {estadoLabel[liq.estado] ?? liq.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {onDownloadPDF && (
                    <Button variant="ghost" size="icon" onClick={() => onDownloadPDF(liq.id)} aria-label="Descargar PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {onSend && (
                    <Button variant="ghost" size="icon" onClick={() => onSend(liq.id)} aria-label="Enviar liquidación">
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button variant="ghost" size="icon" onClick={() => onEdit(liq.id)} aria-label="Editar liquidación">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
