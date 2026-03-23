'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, Briefcase, Clock, FileCheck,
  FileText, Trash2,
} from 'lucide-react'
import { CollapsibleCard } from '@/components/dashboard/CollapsibleCard'
import { LiquidacionTable } from '@/components/dashboard/LiquidacionTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCLP, formatDate } from '@/lib/utils/format'
import type { Contrato, EstadoContrato } from '@/lib/types/contrato'
import type { Liquidacion } from '@/lib/types/liquidacion'

const estadoLabels: Record<EstadoContrato, string> = {
  borrador: 'Borrador',
  generado: 'Generado',
  enviado: 'Enviado',
  firmado: 'Firmado',
  activo: 'Activo',
  terminado: 'Terminado',
}

function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === '') return null
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gesti-dark font-medium text-right">{value}</span>
    </div>
  )
}

export default function ContratoDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [contratoRes, liqRes] = await Promise.all([
          fetch(`/api/contratos/${id}`),
          fetch(`/api/contratos/${id}/liquidaciones`),
        ])

        const contratoData = await contratoRes.json()

        if (!contratoRes.ok || !contratoData.success) {
          setNotFound(true)
          return
        }

        setContrato(contratoData.data)

        if (liqRes.ok) {
          const liqData = await liqRes.json()
          if (liqData.success) {
            setLiquidaciones(liqData.data ?? [])
          }
        }
      } catch {
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  // 404
  if (notFound || !contrato) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-gesti-dark mb-2">Contrato no encontrado</p>
        <p className="text-gray-500 mb-6">El contrato que buscas no existe o fue eliminado.</p>
        <Link href="/contratos">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver a contratos
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/contratos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gesti-dark">
                {contrato.nombre_trabajador} {contrato.apellidos_trabajador}
              </h1>
              <Badge variant={contrato.estado}>{estadoLabels[contrato.estado]}</Badge>
            </div>
            <p className="text-sm text-gray-500">{contrato.razon_social}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {/* TODO: rama-c PDF */}}>
            <FileText className="h-4 w-4 mr-1.5" />
            Generar PDF
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resumen rápido */}
      <Card className="border-gesti-teal/20 bg-gesti-teal/5">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Sueldo</p>
              <p className="text-lg font-semibold text-gesti-dark">{formatCLP(contrato.sueldo_base)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Tipo</p>
              <p className="text-sm font-medium text-gesti-dark">
                {contrato.tipo_contrato === 'puertas_afuera' ? 'Puertas afuera' : 'Puertas adentro'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Jornada</p>
              <p className="text-sm font-medium text-gesti-dark">
                {contrato.tipo_jornada === 'full' ? 'Completa' : 'Parcial'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Inicio</p>
              <p className="text-sm font-medium text-gesti-dark">{formatDate(contrato.fecha_inicio)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secciones colapsables */}
      <CollapsibleCard title="Datos Empleador" icon={<Briefcase className="h-5 w-5" />} defaultOpen>
        <div className="divide-y divide-gray-100">
          <InfoRow label="Razón social" value={contrato.razon_social} />
          <InfoRow label="RUT" value={contrato.rut_empresa} />
          <InfoRow label="Nombre" value={contrato.nombre_empleador} />
          <InfoRow label="Email" value={contrato.email_empleador} />
          <InfoRow label="Teléfono" value={contrato.telefono_empleador} />
          <InfoRow label="Domicilio" value={contrato.domicilio_empleador} />
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Datos Trabajador/a" icon={<User className="h-5 w-5" />} defaultOpen>
        <div className="divide-y divide-gray-100">
          <InfoRow label="Nombre" value={`${contrato.nombre_trabajador} ${contrato.apellidos_trabajador}`} />
          <InfoRow label={contrato.tipo_documento === 'rut' ? 'RUT' : 'Pasaporte'} value={contrato.numero_documento} />
          <InfoRow label="Nacionalidad" value={contrato.nacionalidad} />
          <InfoRow label="Email" value={contrato.email_trabajador} />
          <InfoRow label="Domicilio" value={contrato.domicilio_trabajador} />
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Jornada y Sueldo" icon={<Clock className="h-5 w-5" />}>
        <div className="divide-y divide-gray-100">
          <InfoRow label="Tipo contrato" value={contrato.tipo_contrato === 'puertas_afuera' ? 'Puertas afuera' : 'Puertas adentro'} />
          <InfoRow label="Jornada" value={contrato.tipo_jornada === 'full' ? 'Completa (45 hrs)' : 'Parcial'} />
          <InfoRow label="Sueldo base" value={formatCLP(contrato.sueldo_base)} />
          <InfoRow label="Tipo sueldo" value={contrato.tipo_sueldo === 'liquido' ? 'Líquido' : 'Imponible'} />
          <InfoRow label="AFP" value={contrato.afp} />
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Condiciones" icon={<FileCheck className="h-5 w-5" />}>
        <div className="divide-y divide-gray-100">
          <InfoRow label="Fecha inicio" value={formatDate(contrato.fecha_inicio)} />
          <InfoRow label="Fecha término" value={contrato.fecha_termino ? formatDate(contrato.fecha_termino) : 'Indefinido'} />
          <InfoRow label="Gratificación" value={contrato.gratificacion ? 'Sí' : 'No'} />
          <InfoRow label="Colación" value={formatCLP(contrato.colacion)} />
          <InfoRow label="Movilización" value={formatCLP(contrato.movilizacion)} />
        </div>
      </CollapsibleCard>

      {/* Liquidaciones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gesti-dark">Liquidaciones</h2>
          <Link href={`/liquidaciones/nueva?contrato=${id}`}>
            <Button size="sm">
              Nueva liquidación
            </Button>
          </Link>
        </div>
        <LiquidacionTable
          liquidaciones={liquidaciones}
          onDownloadPDF={() => {
            // TODO: rama-c PDF
          }}
        />
      </div>
    </div>
  )
}
