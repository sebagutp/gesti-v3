'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Send, Wallet, TrendingDown, Building2,
  DollarSign, Info,
} from 'lucide-react'
import { CollapsibleCard } from '@/components/dashboard/CollapsibleCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCLP, formatPeriodo } from '@/lib/utils/format'
import type { Liquidacion } from '@/lib/types/liquidacion'
import type { Contrato } from '@/lib/types/contrato'

const estadoBadgeVariant: Record<string, 'borrador' | 'generado' | 'enviado' | 'activo'> = {
  borrador: 'borrador',
  emitida: 'generado',
  enviada: 'enviado',
  pagada: 'activo',
}

const estadoLabel: Record<string, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  enviada: 'Enviada',
  pagada: 'Pagada',
}

function Row({ label, value }: { label: string; value: number }) {
  if (value === 0) return null
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gesti-dark">{formatCLP(value)}</span>
    </div>
  )
}

function TotalRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
      <span className="font-semibold text-gesti-dark">{label}</span>
      <span className={`text-lg font-bold ${color ?? 'text-gesti-dark'}`}>
        {formatCLP(value)}
      </span>
    </div>
  )
}

export default function LiquidacionDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null)
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/liquidaciones/${id}`)
        const data = await res.json()

        if (!res.ok || !data.success) {
          setNotFound(true)
          return
        }

        setLiquidacion(data.data)

        // Fetch contrato info
        const contRes = await fetch(`/api/contratos/${data.data.contrato_id}`)
        const contData = await contRes.json()
        if (contData.success) {
          setContrato(contData.data)
        }
      } catch {
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (notFound || !liquidacion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-gesti-dark mb-2">Liquidación no encontrada</p>
        <Link href="/liquidaciones">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver a liquidaciones
          </Button>
        </Link>
      </div>
    )
  }

  const { haberes, descuentos_trabajador, cotizaciones_empleador, totales, meta } = liquidacion.resultado

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/liquidaciones">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gesti-dark">
                Liquidación {formatPeriodo(liquidacion.periodo)}
              </h1>
              <Badge variant={estadoBadgeVariant[liquidacion.estado] ?? 'borrador'}>
                {estadoLabel[liquidacion.estado] ?? liquidacion.estado}
              </Badge>
            </div>
            {contrato && (
              <p className="text-sm text-gray-500">
                {contrato.nombre_trabajador} {contrato.apellidos_trabajador} — {contrato.razon_social}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { /* TODO: rama-c PDF */ }}>
            <Download className="h-4 w-4 mr-1.5" />
            Descargar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => { /* TODO: enviar email */ }}>
            <Send className="h-4 w-4 mr-1.5" />
            Enviar
          </Button>
        </div>
      </div>

      {/* Haberes */}
      <CollapsibleCard title="Haberes" icon={<Wallet className="h-5 w-5" />} defaultOpen>
        <div className="space-y-0">
          <Row label="Sueldo base" value={haberes.sueldo_base} />
          <Row label="Gratificación" value={haberes.gratificacion} />
          <Row label="Colación" value={haberes.colacion} />
          <Row label="Movilización" value={haberes.movilizacion} />
          <Row label="Horas extra" value={haberes.horas_extra} />
          <Row label="Asignación familiar" value={haberes.asignacion_familiar} />
          <Row label="Otros bonos" value={haberes.otros_bonos} />
          <TotalRow label="Total Haberes" value={haberes.total_haberes} />
        </div>
      </CollapsibleCard>

      {/* Descuentos */}
      <CollapsibleCard title="Descuentos Trabajador" icon={<TrendingDown className="h-5 w-5" />} defaultOpen>
        <div className="space-y-0">
          <Row label="AFP" value={descuentos_trabajador.afp} />
          <Row label="Salud (7%)" value={descuentos_trabajador.salud} />
          <Row label="Cesantía" value={descuentos_trabajador.cesantia} />
          <Row label="Impuesto (IUSC)" value={descuentos_trabajador.iusc} />
          <Row label="Anticipo" value={descuentos_trabajador.anticipo} />
          <Row label="APV" value={descuentos_trabajador.apv} />
          <TotalRow label="Total Descuentos" value={descuentos_trabajador.total_descuentos} color="text-red-500" />
        </div>
      </CollapsibleCard>

      {/* Cotizaciones Empleador */}
      <CollapsibleCard title="Cotizaciones Empleador" icon={<Building2 className="h-5 w-5" />}>
        <div className="space-y-0">
          <Row label="SIS (1,54%)" value={cotizaciones_empleador.sis} />
          <Row label="ISL Accidentes (0,93%)" value={cotizaciones_empleador.accidentes} />
          <Row label="Indemnización (1,11%)" value={cotizaciones_empleador.indemnizacion} />
          <Row label="Cesantía empleador (3%)" value={cotizaciones_empleador.cesantia} />
          <Row label="AFP empleador (Reforma)" value={cotizaciones_empleador.afp_empleador} />
          <Row label="Expectativa de vida" value={cotizaciones_empleador.expectativa_vida} />
          <Row label="Rentabilidad protegida" value={cotizaciones_empleador.rentabilidad_protegida} />
          <TotalRow label="Total Cotizaciones" value={cotizaciones_empleador.total_cotizaciones} />
        </div>
      </CollapsibleCard>

      {/* Resultado Final */}
      <Card className="border-2 border-gesti-verde/30 bg-gesti-verde/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-gesti-verde" />
            <h3 className="font-semibold text-gesti-dark">Resultado Final</h3>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bruto</span>
              <span className="text-gesti-dark">{formatCLP(totales.bruto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total imponible</span>
              <span className="text-gesti-dark">{formatCLP(totales.total_imponible)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Descuentos</span>
              <span className="text-red-500">-{formatCLP(totales.total_descuentos)}</span>
            </div>

            <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-gesti-verde/30">
              <span className="text-lg font-bold text-gesti-dark">Líquido</span>
              <span className="text-2xl font-bold text-gesti-verde">
                {formatCLP(totales.liquido)}
              </span>
            </div>

            <div className="flex justify-between text-sm pt-2 mt-2 border-t border-gray-200">
              <span className="text-gray-500">Costo total empleador</span>
              <span className="font-medium text-gesti-dark">{formatCLP(totales.costo_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">Información técnica</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>Motor: {meta.motor_version}</div>
            <div>Período: {meta.periodo}</div>
            <div>UF: {formatCLP(meta.indicadores_usados.uf)}</div>
            <div>UTM: {formatCLP(meta.indicadores_usados.utm)}</div>
            <div>RLI calculado: {formatCLP(meta.rli_calculado)}</div>
            <div>Sueldo mín. TCP: {formatCLP(meta.indicadores_usados.sueldo_minimo_tcp)}</div>
          </div>
          {meta.errores && meta.errores.length > 0 && (
            <div className="mt-2 text-xs text-amber-600">
              Advertencias: {meta.errores.join(', ')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
