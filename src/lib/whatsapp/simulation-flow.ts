// ============================================================
// Flujo de Simulación WhatsApp — Gesti V3.1 (Rama D) — HU-331
// Recorre FormSteps secuencialmente, cada mensaje avanza un paso
// ============================================================

import { calcularLiquidacion } from '@/lib/calculos/liquidacion'
import type { InputLiquidacion } from '@/lib/types/liquidacion'
import { sendTextMessage, sendButtonMessage, sendListMessage } from './client'

/** Definición de los pasos del formulario de simulación */
export interface SimulationStep {
  key: string
  prompt: string | ((data: Record<string, unknown>) => string)
  type: 'text' | 'buttons' | 'list'
  options?: Array<{ id: string; title: string; description?: string }>
  validate: (input: string, interactiveId?: string) => string | null // null = valid
  parse: (input: string, interactiveId?: string) => unknown
}

const AFP_OPTIONS = [
  { id: 'afp_Capital', title: 'Capital' },
  { id: 'afp_Cuprum', title: 'Cuprum' },
  { id: 'afp_Habitat', title: 'Habitat' },
  { id: 'afp_PlanVital', title: 'PlanVital' },
  { id: 'afp_Provida', title: 'Provida' },
  { id: 'afp_Modelo', title: 'Modelo' },
  { id: 'afp_Uno', title: 'Uno' },
]

export const SIMULATION_STEPS: SimulationStep[] = [
  {
    key: 'sueldo_base',
    prompt: '💰 *Paso 1/6 — Sueldo*\n\n¿Cuál es el sueldo pactado?\nEscribe el monto en pesos (ej: 600000)',
    type: 'text',
    validate: (input) => {
      const n = Number(input.replace(/\./g, '').replace(/,/g, ''))
      if (isNaN(n) || n <= 0) return 'Ingresa un monto válido (ej: 600000)'
      if (n < 100000) return 'El monto parece muy bajo. Ingresa el sueldo mensual en pesos.'
      return null
    },
    parse: (input) => Number(input.replace(/\./g, '').replace(/,/g, '')),
  },
  {
    key: 'tipo_sueldo',
    prompt: '📋 *Paso 2/6 — Tipo de sueldo*\n\n¿El sueldo pactado es líquido o bruto (imponible)?',
    type: 'buttons',
    options: [
      { id: 'tipo_liquido', title: 'Líquido' },
      { id: 'tipo_imponible', title: 'Bruto/Imponible' },
    ],
    validate: (input, interactiveId) => {
      if (interactiveId === 'tipo_liquido' || interactiveId === 'tipo_imponible') return null
      const lower = input.toLowerCase()
      if (['líquido', 'liquido', 'bruto', 'imponible'].includes(lower)) return null
      return 'Selecciona *Líquido* o *Bruto/Imponible*'
    },
    parse: (_input, interactiveId) => {
      if (interactiveId === 'tipo_liquido') return 'liquido'
      if (interactiveId === 'tipo_imponible') return 'imponible'
      const lower = _input.toLowerCase()
      return ['líquido', 'liquido'].includes(lower) ? 'liquido' : 'imponible'
    },
  },
  {
    key: 'afp',
    prompt: '🏦 *Paso 3/6 — AFP*\n\n¿En qué AFP está afiliado/a el/la trabajador/a?',
    type: 'list',
    options: AFP_OPTIONS,
    validate: (input, interactiveId) => {
      if (interactiveId?.startsWith('afp_')) return null
      const names = AFP_OPTIONS.map((o) => o.title.toLowerCase())
      if (names.includes(input.toLowerCase())) return null
      return 'Selecciona una AFP de la lista'
    },
    parse: (input, interactiveId) => {
      if (interactiveId?.startsWith('afp_')) return interactiveId.replace('afp_', '')
      const found = AFP_OPTIONS.find((o) => o.title.toLowerCase() === input.toLowerCase())
      return found?.title ?? input
    },
  },
  {
    key: 'es_pensionado',
    prompt: '👤 *Paso 4/6 — ¿Pensionado/a?*\n\n¿El/la trabajador/a es pensionado/a?',
    type: 'buttons',
    options: [
      { id: 'pens_no', title: 'No' },
      { id: 'pens_si', title: 'Sí' },
    ],
    validate: (input, interactiveId) => {
      if (interactiveId === 'pens_no' || interactiveId === 'pens_si') return null
      const lower = input.toLowerCase()
      if (['si', 'sí', 'no'].includes(lower)) return null
      return 'Responde *Sí* o *No*'
    },
    parse: (_input, interactiveId) => {
      if (interactiveId === 'pens_si') return true
      if (interactiveId === 'pens_no') return false
      return ['si', 'sí'].includes(_input.toLowerCase())
    },
  },
  {
    key: 'dias_trabajados',
    prompt: '📅 *Paso 5/6 — Días trabajados*\n\n¿Cuántos días trabajó en el mes? (1-30)',
    type: 'text',
    validate: (input) => {
      const n = Number(input)
      if (isNaN(n) || n < 1 || n > 30 || !Number.isInteger(n)) return 'Ingresa un número entre 1 y 30'
      return null
    },
    parse: (input) => Number(input),
  },
  {
    key: 'cargas_familiares',
    prompt: '👶 *Paso 6/6 — Cargas familiares*\n\n¿Cuántas cargas familiares tiene? (0 si no tiene)',
    type: 'text',
    validate: (input) => {
      const n = Number(input)
      if (isNaN(n) || n < 0 || n > 20 || !Number.isInteger(n)) return 'Ingresa un número entre 0 y 20'
      return null
    },
    parse: (input) => Number(input),
  },
]

/** Enviar el prompt del paso actual */
export async function sendStepPrompt(to: string, stepIndex: number, data: Record<string, unknown>): Promise<void> {
  const step = SIMULATION_STEPS[stepIndex]
  if (!step) return

  const promptText = typeof step.prompt === 'function' ? step.prompt(data) : step.prompt

  if (step.type === 'buttons' && step.options) {
    await sendButtonMessage(to, promptText, step.options)
  } else if (step.type === 'list' && step.options) {
    await sendListMessage(to, promptText, 'Seleccionar', 'Opciones', step.options)
  } else {
    await sendTextMessage(to, promptText)
  }
}

/** Procesar respuesta del usuario para el paso actual. Retorna el nuevo stepIndex. */
export async function processStepResponse(
  to: string,
  stepIndex: number,
  text: string,
  interactiveId: string | undefined,
  data: Record<string, unknown>
): Promise<{ nextStep: number; data: Record<string, unknown>; completed: boolean }> {
  const step = SIMULATION_STEPS[stepIndex]
  if (!step) return { nextStep: 0, data, completed: false }

  const error = step.validate(text, interactiveId)
  if (error) {
    await sendTextMessage(to, `❌ ${error}`)
    return { nextStep: stepIndex, data, completed: false }
  }

  const value = step.parse(text, interactiveId)
  const updatedData = { ...data, [step.key]: value }

  const nextStep = stepIndex + 1
  if (nextStep >= SIMULATION_STEPS.length) {
    // All steps completed — run calculation
    await runSimulationAndSendResult(to, updatedData)
    return { nextStep: 0, data: {}, completed: true }
  }

  // Send next step prompt
  await sendStepPrompt(to, nextStep, updatedData)
  return { nextStep, data: updatedData, completed: false }
}

/** Ejecutar calcularLiquidacion y enviar resultado formateado */
async function runSimulationAndSendResult(to: string, data: Record<string, unknown>): Promise<void> {
  try {
    await sendTextMessage(to, '⏳ Calculando tu liquidación...')

    const input: InputLiquidacion = {
      sueldo_base: data.sueldo_base as number,
      tipo_sueldo: data.tipo_sueldo as 'liquido' | 'imponible',
      afp: data.afp as string,
      es_pensionado: data.es_pensionado as boolean,
      dias_trabajados: data.dias_trabajados as number,
      cargas_familiares: (data.cargas_familiares as number) || 0,
    }

    const resultado = calcularLiquidacion(input)

    if (resultado.meta.errores && resultado.meta.errores.length > 0) {
      await sendTextMessage(to, `⚠️ Error en el cálculo:\n${resultado.meta.errores.join('\n')}`)
      return
    }

    const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

    const message = [
      '✅ *RESULTADO SIMULACIÓN LIQUIDACIÓN*',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '📊 *Haberes*',
      `  Sueldo base: ${fmt(resultado.haberes.sueldo_base)}`,
      resultado.haberes.asignacion_familiar > 0 ? `  Asig. familiar: ${fmt(resultado.haberes.asignacion_familiar)}` : '',
      `  *Total haberes: ${fmt(resultado.haberes.total_haberes)}*`,
      '',
      '📉 *Descuentos trabajador*',
      `  AFP: ${fmt(resultado.descuentos_trabajador.afp)}`,
      `  Salud (7%): ${fmt(resultado.descuentos_trabajador.salud)}`,
      resultado.descuentos_trabajador.iusc > 0 ? `  Impuesto (IUSC): ${fmt(resultado.descuentos_trabajador.iusc)}` : '  Impuesto (IUSC): Exento',
      `  *Total descuentos: ${fmt(resultado.descuentos_trabajador.total_descuentos)}*`,
      '',
      '💵 *SUELDO LÍQUIDO: ' + fmt(resultado.totales.liquido) + '*',
      '',
      '🏢 *Costo empleador*',
      `  Cotizaciones: ${fmt(resultado.cotizaciones_empleador.total_cotizaciones)}`,
      `  *Costo total: ${fmt(resultado.totales.costo_total)}*`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `Motor v3.1 | UF: ${fmt(resultado.meta.indicadores_usados.uf)}`,
      '',
      'Escribe *hola* para otra simulación o *consulta* para preguntas laborales.',
    ].filter(Boolean).join('\n')

    await sendTextMessage(to, message)
  } catch (error) {
    console.error('[WA Simulation] Error:', error)
    await sendTextMessage(to, '❌ Ocurrió un error al calcular. Intenta nuevamente escribiendo *hola*.')
  }
}
