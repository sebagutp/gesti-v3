'use client'

import { useCallback } from 'react'
import { MultiStepForm } from '@/components/forms/MultiStepForm'
import { simuladorSteps } from './steps'
import type { InputLiquidacion } from '@/lib/types/liquidacion'

interface SimuladorLiquidacionProps {
  onCalculate: (input: InputLiquidacion) => void
  isLoading?: boolean
}

export function SimuladorLiquidacion({ onCalculate, isLoading }: SimuladorLiquidacionProps) {
  const handleComplete = useCallback(
    (answers: Record<string, unknown>) => {
      const input: InputLiquidacion = {
        sueldo_base: Number(answers.sueldo_base),
        tipo_sueldo: answers.tipo_sueldo as InputLiquidacion['tipo_sueldo'],
        afp: answers.afp as string,
        es_pensionado: answers.es_pensionado === 'true',
        dias_trabajados: Number(answers.dias_trabajados),
        horas_extra: answers.horas_extra ? Number(answers.horas_extra) : undefined,
        cargas_familiares: answers.cargas_familiares ? Number(answers.cargas_familiares) : undefined,
        colacion: answers.colacion ? Number(answers.colacion) : undefined,
        movilizacion: answers.movilizacion ? Number(answers.movilizacion) : undefined,
      }
      onCalculate(input)
    },
    [onCalculate]
  )

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-3 border-gesti-verde border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Calculando liquidación...</p>
          </div>
        </div>
      )}
      <MultiStepForm
        steps={simuladorSteps}
        onComplete={handleComplete}
        title="Simulador de Liquidación"
        description="Calcula el sueldo líquido de tu trabajador/a de casa particular"
        showProgress
        storageKey="simulador"
      />
    </div>
  )
}
