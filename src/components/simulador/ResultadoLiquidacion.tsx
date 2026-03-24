'use client'

import { motion } from 'framer-motion'
import { Wallet, TrendingDown, Building2, DollarSign, RefreshCw } from 'lucide-react'
import { CollapsibleCard } from '@/components/dashboard/CollapsibleCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/utils/format'
import type { ResultadoLiquidacion as ResultadoType } from '@/lib/types/liquidacion'

interface ResultadoLiquidacionProps {
  resultado: ResultadoType
  showPDFButton?: boolean
  onDownloadPDF?: () => void
  onReset?: () => void
}

function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={highlight ? 'font-semibold text-gesti-dark' : 'text-sm text-gesti-dark'}>
        {formatCLP(value)}
      </span>
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

export function ResultadoLiquidacion({
  resultado,
  showPDFButton = false,
  onDownloadPDF,
  onReset,
}: ResultadoLiquidacionProps) {
  const { haberes, descuentos_trabajador, cotizaciones_empleador, totales } = resultado

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto space-y-4"
    >
      {/* Haberes */}
      <CollapsibleCard title="Haberes" icon={<Wallet className="h-5 w-5" />} defaultOpen>
        <div className="space-y-0">
          {haberes.sueldo_base > 0 && <Row label="Sueldo base" value={haberes.sueldo_base} />}
          {haberes.gratificacion > 0 && <Row label="Gratificación" value={haberes.gratificacion} />}
          {haberes.colacion > 0 && <Row label="Colación" value={haberes.colacion} />}
          {haberes.movilizacion > 0 && <Row label="Movilización" value={haberes.movilizacion} />}
          {haberes.horas_extra > 0 && <Row label="Horas extra" value={haberes.horas_extra} />}
          {haberes.asignacion_familiar > 0 && <Row label="Asignación familiar" value={haberes.asignacion_familiar} />}
          {haberes.otros_bonos > 0 && <Row label="Otros bonos" value={haberes.otros_bonos} />}
          <TotalRow label="Total Haberes" value={haberes.total_haberes} />
        </div>
      </CollapsibleCard>

      {/* Descuentos */}
      <CollapsibleCard title="Descuentos Trabajador" icon={<TrendingDown className="h-5 w-5" />} defaultOpen>
        <div className="space-y-0">
          {descuentos_trabajador.afp > 0 && <Row label="AFP" value={descuentos_trabajador.afp} />}
          {descuentos_trabajador.salud > 0 && <Row label="Salud (7%)" value={descuentos_trabajador.salud} />}
          {descuentos_trabajador.cesantia > 0 && <Row label="Cesantía" value={descuentos_trabajador.cesantia} />}
          {descuentos_trabajador.iusc > 0 && <Row label="Impuesto (IUSC)" value={descuentos_trabajador.iusc} />}
          {descuentos_trabajador.anticipo > 0 && <Row label="Anticipo" value={descuentos_trabajador.anticipo} />}
          {descuentos_trabajador.apv > 0 && <Row label="APV" value={descuentos_trabajador.apv} />}
          <TotalRow label="Total Descuentos" value={descuentos_trabajador.total_descuentos} color="text-red-500" />
        </div>
      </CollapsibleCard>

      {/* Cotizaciones Empleador */}
      <CollapsibleCard title="Cotizaciones Empleador" icon={<Building2 className="h-5 w-5" />}>
        <div className="space-y-0">
          {cotizaciones_empleador.sis > 0 && <Row label="SIS (1,54%)" value={cotizaciones_empleador.sis} />}
          {cotizaciones_empleador.accidentes > 0 && <Row label="ISL Accidentes (0,93%)" value={cotizaciones_empleador.accidentes} />}
          {cotizaciones_empleador.indemnizacion > 0 && <Row label="Indemnización (1,11%)" value={cotizaciones_empleador.indemnizacion} />}
          {cotizaciones_empleador.cesantia > 0 && <Row label="Cesantía empleador (3%)" value={cotizaciones_empleador.cesantia} />}
          {cotizaciones_empleador.afp_empleador > 0 && <Row label="AFP empleador (Reforma)" value={cotizaciones_empleador.afp_empleador} />}
          {cotizaciones_empleador.expectativa_vida > 0 && <Row label="Expectativa de vida" value={cotizaciones_empleador.expectativa_vida} />}
          {cotizaciones_empleador.rentabilidad_protegida > 0 && <Row label="Rentabilidad protegida" value={cotizaciones_empleador.rentabilidad_protegida} />}
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

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Nueva simulación
          </Button>
        )}
        {showPDFButton && onDownloadPDF && (
          <Button onClick={onDownloadPDF}>
            Descargar PDF
          </Button>
        )}
      </div>
    </motion.div>
  )
}
