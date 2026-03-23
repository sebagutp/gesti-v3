'use client'

import { useState } from 'react'
import { SimuladorLiquidacion } from '@/components/simulador/SimuladorLiquidacion'
import { ResultadoLiquidacion } from '@/components/simulador/ResultadoLiquidacion'
import type { InputLiquidacion, ResultadoLiquidacion as ResultadoType } from '@/lib/types/liquidacion'
import { trackEvent } from '@/lib/analytics'

type View = 'form' | 'result' | 'error'

export default function SimuladorPage() {
  const [view, setView] = useState<View>('form')
  const [resultado, setResultado] = useState<ResultadoType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleCalculate(input: InputLiquidacion) {
    setIsLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/calcular-liquidacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message ?? 'Error al calcular la liquidación')
      }

      setResultado(data.data)
      setView('result')
      trackEvent('Contrato_simulado', {
        sueldo_base: input.sueldo_base,
        tipo_sueldo: input.tipo_sueldo,
        afp: input.afp,
      })
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado')
      setView('error')
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
    setResultado(null)
    setView('form')
    setErrorMsg('')
  }

  return (
    <main className="min-h-screen bg-gesti-bg">
      {/* Header */}
      <div className="bg-gesti-teal text-white py-8 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold mb-2">Simulador de Liquidación TCP</h1>
          <p className="text-white/80 text-sm">
            Calcula gratis el sueldo líquido de tu trabajador/a de casa particular
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="py-8 px-4">
        {view === 'form' && (
          <SimuladorLiquidacion onCalculate={handleCalculate} isLoading={isLoading} />
        )}

        {view === 'result' && resultado && (
          <ResultadoLiquidacion resultado={resultado} onReset={handleReset} />
        )}

        {view === 'error' && (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-600 font-medium mb-2">Error en el cálculo</p>
              <p className="text-sm text-red-500 mb-4">{errorMsg}</p>
              <button
                onClick={handleReset}
                className="text-sm text-gesti-teal underline hover:no-underline"
              >
                Volver a intentar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {view === 'form' && (
        <div className="text-center pb-8 px-4">
          <p className="text-xs text-gray-400">
            Cálculo basado en indicadores previsionales vigentes.
            Para liquidaciones oficiales con PDF, usa un plan Pro.
          </p>
        </div>
      )}
    </main>
  )
}
