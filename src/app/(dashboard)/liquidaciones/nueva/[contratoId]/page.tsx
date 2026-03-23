'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LiquidacionForm } from '@/components/forms/LiquidacionForm'
import { ResultadoLiquidacion } from '@/components/simulador/ResultadoLiquidacion'
import type { Contrato } from '@/lib/types/contrato'
import type { Liquidacion, InputLiquidacion } from '@/lib/types/liquidacion'

type View = 'form' | 'result' | 'error'

export default function NuevaLiquidacionPage() {
  const params = useParams()
  const router = useRouter()
  const contratoId = params.contratoId as string

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [view, setView] = useState<View>('form')
  const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [existingPeriodo, setExistingPeriodo] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContrato() {
      try {
        const res = await fetch(`/api/contratos/${contratoId}`)
        const data = await res.json()
        if (data.success) {
          setContrato(data.data)
        }
      } catch {
        // not found
      } finally {
        setIsLoading(false)
      }
    }
    fetchContrato()
  }, [contratoId])

  async function handleSubmit(periodo: string, input: InputLiquidacion) {
    setIsSubmitting(true)
    setErrorMsg('')
    setExistingPeriodo(null)

    try {
      const res = await fetch('/api/liquidaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato_id: contratoId, periodo, input }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.error?.code === 'PERIODO_DUPLICADO') {
          setExistingPeriodo(periodo)
          return
        }
        throw new Error(data.error?.message ?? 'Error al crear la liquidación')
      }

      setLiquidacion(data.data)
      setView('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado')
      setView('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!contrato) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-gesti-dark mb-2">Contrato no encontrado</p>
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
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/contratos/${contratoId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-gesti-dark">Nueva Liquidación</h1>
      </div>

      {view === 'form' && (
        <LiquidacionForm
          contrato={contrato}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          existingPeriodo={existingPeriodo}
        />
      )}

      {view === 'result' && liquidacion && (
        <div className="space-y-6">
          <ResultadoLiquidacion
            resultado={liquidacion.resultado}
            showPDFButton
            onDownloadPDF={() => {
              // TODO: rama-c PDF generation
            }}
            onReset={() => setView('form')}
          />
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push(`/liquidaciones/${liquidacion.id}`)}
            >
              Ver detalle completo
            </Button>
          </div>
        </div>
      )}

      {view === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Error en el cálculo</p>
          <p className="text-sm text-red-500 mb-4">{errorMsg}</p>
          <button
            onClick={() => setView('form')}
            className="text-sm text-gesti-teal underline hover:no-underline"
          >
            Volver a intentar
          </button>
        </div>
      )}
    </div>
  )
}
