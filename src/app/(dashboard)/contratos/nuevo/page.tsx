'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { MultiStepForm } from '@/components/forms/MultiStepForm'
import { contractFormSteps } from '@/components/forms/ContractForm/steps'

export default function NuevoContratoPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  const handleComplete = useCallback(
    async (answers: Record<string, unknown>) => {
      setError('')

      // Merge documento bifurcado en numero_documento
      const numero_documento =
        (answers.numero_documento_rut as string) ||
        (answers.numero_documento_pasaporte as string) ||
        ''

      const payload = {
        razon_social: answers.razon_social,
        rut_empresa: answers.rut_empresa,
        nombre_empleador: answers.nombre_empleador,
        email_empleador: answers.email_empleador,
        telefono_empleador: answers.telefono_empleador || undefined,
        domicilio_empleador: answers.domicilio_empleador,
        nombre_trabajador: answers.nombre_trabajador,
        apellidos_trabajador: answers.apellidos_trabajador,
        tipo_documento: answers.tipo_documento,
        numero_documento,
        nacionalidad: answers.nacionalidad,
        email_trabajador: answers.email_trabajador,
        domicilio_trabajador: answers.domicilio_trabajador,
        tipo_contrato: answers.tipo_contrato,
        tipo_jornada: answers.tipo_jornada,
        sueldo_base: Number(answers.sueldo_base),
        tipo_sueldo: answers.tipo_sueldo,
        afp: answers.afp,
        fecha_inicio: answers.fecha_inicio,
        fecha_termino: answers.fecha_termino || undefined,
        gratificacion: answers.gratificacion === 'true',
        colacion: Number(answers.colacion) || 0,
        movilizacion: Number(answers.movilizacion) || 0,
        vigente: true,
      }

      try {
        const res = await fetch('/api/contratos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error?.message ?? 'Error al crear contrato')
        }

        router.push(`/contratos/${data.data.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado')
      }
    },
    [router]
  )

  return (
    <div className="max-w-2xl mx-auto py-4">
      <MultiStepForm
        steps={contractFormSteps}
        onComplete={handleComplete}
        title="Nuevo Contrato"
        description="Completa los datos para generar el contrato de trabajo"
        showProgress
        storageKey="contrato-nuevo"
      />

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
