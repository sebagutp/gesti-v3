'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { PermisoForm } from '@/components/forms/PermisoForm'
import { formatDate } from '@/lib/utils/format'
import type { Contrato } from '@/lib/types/contrato'

interface Permiso {
  id: string
  contrato_id: string
  user_id: string
  tipo: string
  fecha_inicio: string
  fecha_fin: string
  notas?: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  created_at: string
}

const tipoLabel: Record<string, string> = {
  vacaciones: 'Vacaciones',
  licencia_enfermedad: 'Licencia enfermedad',
  licencia_parental: 'Licencia parental',
  permiso_sin_pago: 'Permiso sin pago',
}

const estadoBadge: Record<string, 'generado' | 'activo' | 'terminado'> = {
  pendiente: 'generado',
  aprobado: 'activo',
  rechazado: 'terminado',
}

function getDays(inicio: string, fin: string): number {
  const d1 = new Date(inicio)
  const d2 = new Date(fin)
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tipoFilter, setTipoFilter] = useState<string>('todos')

  async function fetchData() {
    try {
      const [permRes, contRes] = await Promise.all([
        fetch('/api/permisos'),
        fetch('/api/contratos'),
      ])
      const permData = await permRes.json()
      const contData = await contRes.json()

      if (permData.success) setPermisos(permData.data ?? [])
      if (contData.success) setContratos(contData.data ?? [])
    } catch {
      // APIs not ready
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const contratosMap = useMemo(() => {
    const map: Record<string, Contrato> = {}
    contratos.forEach((c) => { map[c.id] = c })
    return map
  }, [contratos])

  const filtered = useMemo(() => {
    if (tipoFilter === 'todos') return permisos
    return permisos.filter((p) => p.tipo === tipoFilter)
  }, [permisos, tipoFilter])

  async function handleCreate(data: {
    contrato_id: string
    tipo: string
    fecha_inicio: string
    fecha_fin: string
    notas?: string
  }) {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        setPermisos((prev) => [result.data, ...prev])
        setShowForm(false)
      }
    } catch {
      // error
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gesti-verde/10 rounded-2xl flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-gesti-verde" />
        </div>
        <h2 className="text-xl font-semibold text-gesti-dark mb-2">Sin permisos</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Para registrar permisos primero necesitas un contrato.
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
        <h1 className="text-xl font-semibold text-gesti-dark">Permisos y Vacaciones</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo permiso
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-gesti-dark mb-4">Registrar permiso</h2>
            <PermisoForm
              contratos={contratos}
              onSubmit={handleCreate}
              isLoading={isSubmitting}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {['todos', 'vacaciones', 'licencia_enfermedad', 'licencia_parental', 'permiso_sin_pago'].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setTipoFilter(tipo)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              tipoFilter === tipo
                ? 'bg-gesti-teal text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tipo === 'todos' ? 'Todos' : tipoLabel[tipo] ?? tipo}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">Sin permisos registrados</p>
          <p className="text-sm mt-1">Los permisos y vacaciones aparecerán aquí.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>Trabajador/a</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden sm:table-cell">Inicio</TableHead>
              <TableHead className="hidden sm:table-cell">Término</TableHead>
              <TableHead className="text-center">Días</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const cont = contratosMap[p.contrato_id]
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {cont ? `${cont.nombre_trabajador} ${cont.apellidos_trabajador}` : '—'}
                  </TableCell>
                  <TableCell>{tipoLabel[p.tipo] ?? p.tipo}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(p.fecha_inicio)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(p.fecha_fin)}</TableCell>
                  <TableCell className="text-center">{getDays(p.fecha_inicio, p.fecha_fin)}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadge[p.estado] ?? 'borrador'}>
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
