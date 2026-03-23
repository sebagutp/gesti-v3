'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Contrato } from '@/lib/types/contrato'
import type { InputLiquidacion } from '@/lib/types/liquidacion'
import { formatCLP } from '@/lib/utils/format'

interface LiquidacionFormProps {
  contrato: Contrato
  onSubmit: (periodo: string, input: InputLiquidacion) => void
  isLoading?: boolean
  existingPeriodo?: string | null
}

function getCurrentPeriodo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function LiquidacionForm({ contrato, onSubmit, isLoading, existingPeriodo }: LiquidacionFormProps) {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo())
  const [diasTrabajados, setDiasTrabajados] = useState(30)
  const [horasExtra, setHorasExtra] = useState(0)
  const [anticipo, setAnticipo] = useState(0)
  const [otrosBonos, setOtrosBonos] = useState(0)
  const [diasLicencia, setDiasLicencia] = useState(0)
  const [rima, setRima] = useState(0)
  const [showLicencia, setShowLicencia] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const input: InputLiquidacion = {
      sueldo_base: contrato.sueldo_base,
      tipo_sueldo: contrato.tipo_sueldo,
      afp: contrato.afp,
      es_pensionado: false,
      dias_trabajados: diasTrabajados,
      horas_extra: horasExtra || undefined,
      anticipo: anticipo || undefined,
      otros_bonos: otrosBonos || undefined,
      dias_licencia_medica: diasLicencia || undefined,
      rima: diasLicencia > 0 && diasLicencia < 30 ? rima || undefined : undefined,
      colacion: contrato.colacion || undefined,
      movilizacion: contrato.movilizacion || undefined,
      gratificacion: contrato.gratificacion ? 1 : undefined,
      cargas_familiares: 0,
    }

    onSubmit(periodo, input)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contract summary */}
      <Card className="border-gesti-teal/20 bg-gesti-teal/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Trabajador/a</span>
              <p className="font-medium text-gesti-dark">{contrato.nombre_trabajador} {contrato.apellidos_trabajador}</p>
            </div>
            <div>
              <span className="text-gray-500">Empleador</span>
              <p className="font-medium text-gesti-dark">{contrato.razon_social}</p>
            </div>
            <div>
              <span className="text-gray-500">Sueldo base</span>
              <p className="font-medium text-gesti-dark">{formatCLP(contrato.sueldo_base)}</p>
            </div>
            <div>
              <span className="text-gray-500">AFP</span>
              <p className="font-medium text-gesti-dark">{contrato.afp}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period */}
      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Período</label>
        <input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
          required
        />
        {existingPeriodo && (
          <p className="text-sm text-amber-600 mt-1">
            Ya existe una liquidación para este período.
          </p>
        )}
      </div>

      {/* Days worked */}
      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Días trabajados</label>
        <input
          type="number"
          value={diasTrabajados}
          onChange={(e) => setDiasTrabajados(Number(e.target.value))}
          min={1}
          max={30}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
          required
        />
      </div>

      {/* Overtime */}
      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Horas extra</label>
        <input
          type="number"
          value={horasExtra}
          onChange={(e) => setHorasExtra(Number(e.target.value))}
          min={0}
          max={100}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
        />
        <p className="text-xs text-gray-400 mt-1">Se pagan con 50% de recargo</p>
      </div>

      {/* Anticipo */}
      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Anticipo</label>
        <input
          type="number"
          value={anticipo}
          onChange={(e) => setAnticipo(Number(e.target.value))}
          min={0}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
        />
      </div>

      {/* Other bonuses */}
      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Otros bonos</label>
        <input
          type="number"
          value={otrosBonos}
          onChange={(e) => setOtrosBonos(Number(e.target.value))}
          min={0}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
        />
      </div>

      {/* Medical leave toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLicencia}
            onChange={(e) => {
              setShowLicencia(e.target.checked)
              if (!e.target.checked) {
                setDiasLicencia(0)
                setRima(0)
              }
            }}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gesti-dark">Tiene licencia médica este mes</span>
        </label>
      </div>

      {showLicencia && (
        <div className="space-y-4 pl-4 border-l-2 border-gesti-verde/30">
          <div>
            <label className="block text-sm font-medium text-gesti-dark mb-1.5">Días de licencia</label>
            <input
              type="number"
              value={diasLicencia}
              onChange={(e) => setDiasLicencia(Number(e.target.value))}
              min={1}
              max={30}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
              required
            />
          </div>
          {diasLicencia > 0 && diasLicencia < 30 && (
            <div>
              <label className="block text-sm font-medium text-gesti-dark mb-1.5">
                RIMA (Remuneración Imponible Mensual Anterior)
              </label>
              <input
                type="number"
                value={rima}
                onChange={(e) => setRima(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Obligatorio cuando la licencia es parcial (menos de 30 días)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Calculando...
          </span>
        ) : (
          'Calcular liquidación'
        )}
      </Button>
    </form>
  )
}
