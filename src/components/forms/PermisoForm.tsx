'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Contrato } from '@/lib/types/contrato'

interface PermisoFormProps {
  contratos: Contrato[]
  onSubmit: (data: {
    contrato_id: string
    tipo: string
    fecha_inicio: string
    fecha_fin: string
    notas?: string
  }) => void
  isLoading?: boolean
  onCancel?: () => void
}

const TIPOS_PERMISO = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'licencia_enfermedad', label: 'Licencia por enfermedad' },
  { value: 'licencia_parental', label: 'Licencia parental' },
  { value: 'permiso_sin_pago', label: 'Permiso sin pago' },
]

export function PermisoForm({ contratos, onSubmit, isLoading, onCancel }: PermisoFormProps) {
  const [contratoId, setContratoId] = useState(contratos[0]?.id ?? '')
  const [tipo, setTipo] = useState('vacaciones')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [notas, setNotas] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      contrato_id: contratoId,
      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      notas: notas || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Contrato</label>
        <select
          value={contratoId}
          onChange={(e) => setContratoId(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
          required
        >
          {contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre_trabajador} {c.apellidos_trabajador}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Tipo de permiso</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
          required
        >
          {TIPOS_PERMISO.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gesti-dark mb-1.5">Fecha inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gesti-dark mb-1.5">Fecha término</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            min={fechaInicio}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gesti-dark mb-1.5">Notas (opcional)</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gesti-verde/50 resize-none"
          placeholder="Observaciones adicionales..."
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Crear permiso'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
