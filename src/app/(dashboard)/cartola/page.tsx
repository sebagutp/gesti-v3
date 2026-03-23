'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FileText, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCLP, formatPeriodo, formatDate } from '@/lib/utils/format'
import type { Contrato } from '@/lib/types/contrato'
import type { Liquidacion } from '@/lib/types/liquidacion'

export default function CartolaPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [selectedContrato, setSelectedContrato] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [contRes, liqRes] = await Promise.all([
          fetch('/api/contratos'),
          fetch('/api/liquidaciones'),
        ])
        const contData = await contRes.json()
        const liqData = await liqRes.json()

        if (contData.success) {
          setContratos(contData.data ?? [])
          if (contData.data?.length > 0) {
            setSelectedContrato(contData.data[0].id)
          }
        }
        if (liqData.success) setLiquidaciones(liqData.data ?? [])
      } catch {
        // APIs not ready
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const contrato = useMemo(
    () => contratos.find((c) => c.id === selectedContrato),
    [contratos, selectedContrato]
  )

  const contratoLiquidaciones = useMemo(
    () => liquidaciones
      .filter((l) => l.contrato_id === selectedContrato)
      .sort((a, b) => b.periodo.localeCompare(a.periodo)),
    [liquidaciones, selectedContrato]
  )

  const totalesAcumulados = useMemo(() => {
    return contratoLiquidaciones.reduce(
      (acc, l) => ({
        bruto: acc.bruto + l.resultado.totales.bruto,
        descuentos: acc.descuentos + l.resultado.totales.total_descuentos,
        liquido: acc.liquido + l.resultado.totales.liquido,
        empleador: acc.empleador + l.resultado.cotizaciones_empleador.total_cotizaciones,
        costoTotal: acc.costoTotal + l.resultado.totales.costo_total,
      }),
      { bruto: 0, descuentos: 0, liquido: 0, empleador: 0, costoTotal: 0 }
    )
  }, [contratoLiquidaciones])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gesti-verde/10 rounded-2xl flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-gesti-verde" />
        </div>
        <h2 className="text-xl font-semibold text-gesti-dark mb-2">Sin cartola</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Necesitas al menos un contrato con liquidaciones para ver la cartola consolidada.
        </p>
        <Link href="/contratos/nuevo">
          <Button>Crear contrato</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gesti-dark">Cartola Consolidada</h1>
        <select
          value={selectedContrato}
          onChange={(e) => setSelectedContrato(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
        >
          {contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre_trabajador} {c.apellidos_trabajador}
            </option>
          ))}
        </select>
      </div>

      {/* Contract summary */}
      {contrato && (
        <Card className="border-gesti-teal/20 bg-gesti-teal/5">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">Sueldo base</p>
                <p className="text-lg font-semibold text-gesti-dark">{formatCLP(contrato.sueldo_base)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo contrato</p>
                <p className="text-sm font-medium text-gesti-dark">
                  {contrato.tipo_contrato === 'puertas_afuera' ? 'Puertas afuera' : 'Puertas adentro'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Inicio</p>
                <p className="text-sm font-medium text-gesti-dark">{formatDate(contrato.fecha_inicio)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Liquidaciones</p>
                <p className="text-lg font-semibold text-gesti-dark">{contratoLiquidaciones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totales acumulados */}
      {contratoLiquidaciones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 text-gesti-verde mx-auto mb-2" />
              <p className="text-xs text-gray-500">Total líquido</p>
              <p className="text-lg font-bold text-gesti-verde">{formatCLP(totalesAcumulados.liquido)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 text-gesti-teal mx-auto mb-2" />
              <p className="text-xs text-gray-500">Total bruto</p>
              <p className="text-lg font-bold text-gesti-dark">{formatCLP(totalesAcumulados.bruto)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-5 w-5 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Cotiz. empleador</p>
              <p className="text-lg font-bold text-gesti-dark">{formatCLP(totalesAcumulados.empleador)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 text-red-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Costo total</p>
              <p className="text-lg font-bold text-gesti-dark">{formatCLP(totalesAcumulados.costoTotal)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liquidaciones table */}
      {contratoLiquidaciones.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">Sin liquidaciones para este contrato</p>
          <p className="text-sm mt-1">
            <Link href={`/liquidaciones/nueva/${selectedContrato}`} className="text-gesti-teal underline">
              Crear la primera liquidación
            </Link>
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Descuentos</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Costo empleador</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratoLiquidaciones.slice(0, 6).map((liq) => (
                  <TableRow key={liq.id}>
                    <TableCell>
                      <Link href={`/liquidaciones/${liq.id}`} className="text-gesti-teal hover:underline font-medium">
                        {formatPeriodo(liq.periodo)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatCLP(liq.resultado.totales.bruto)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell text-red-500">
                      -{formatCLP(liq.resultado.totales.total_descuentos)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gesti-teal">
                      {formatCLP(liq.resultado.totales.liquido)}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {formatCLP(liq.resultado.totales.costo_total)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={liq.estado === 'pagada' ? 'activo' : 'generado'}>
                        {liq.estado.charAt(0).toUpperCase() + liq.estado.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
