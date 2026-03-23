'use client'

import { FileText, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCLP, formatDate } from '@/lib/utils/format'
import type { Contrato, EstadoContrato } from '@/lib/types/contrato'

interface ContractCardProps {
  contrato: Contrato
  onEdit?: () => void
  onGeneratePDF?: () => void
  onDelete?: () => void
}

const estadoLabels: Record<EstadoContrato, string> = {
  borrador: 'Borrador',
  generado: 'Generado',
  enviado: 'Enviado',
  firmado: 'Firmado',
  activo: 'Activo',
  terminado: 'Terminado',
}

export function ContractCard({ contrato, onEdit, onGeneratePDF, onDelete }: ContractCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header: nombre + badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gesti-dark truncate">
              {contrato.nombre_trabajador} {contrato.apellidos_trabajador}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              Empleador: {contrato.razon_social}
            </p>
          </div>
          <Badge variant={contrato.estado}>
            {estadoLabels[contrato.estado]}
          </Badge>
        </div>

        {/* Info */}
        <div className="space-y-1 mb-4 text-sm text-gesti-dark">
          <p>
            <span className="text-gray-500">Sueldo:</span>{' '}
            <span className="font-medium">{formatCLP(contrato.sueldo_base)}</span>
          </p>
          <p>
            <span className="text-gray-500">Desde:</span>{' '}
            {formatDate(contrato.fecha_inicio)}
          </p>
          <p>
            <span className="text-gray-500">Jornada:</span>{' '}
            {contrato.tipo_jornada === 'full' ? 'Completa' : 'Parcial'} &middot;{' '}
            {contrato.tipo_contrato === 'puertas_afuera' ? 'Puertas afuera' : 'Puertas adentro'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="text-gray-500 hover:text-gesti-teal">
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
          )}
          {onGeneratePDF && (
            <Button variant="ghost" size="sm" onClick={onGeneratePDF} className="text-gray-500 hover:text-gesti-teal">
              <FileText className="h-4 w-4 mr-1.5" />
              PDF
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="ml-auto text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
