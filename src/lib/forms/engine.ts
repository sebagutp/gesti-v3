import type { FormStep, FormShowIf } from '@/lib/types/forms'

/**
 * Evalúa si un step debe mostrarse según su condición showIf.
 * Función pura — puede reutilizarse en WhatsApp bot runner.
 */
export function evaluateShowIf(
  condition: FormShowIf | undefined,
  answers: Record<string, unknown>
): boolean {
  if (!condition) return true

  const fieldValue = answers[condition.field]

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value
    case 'not_equals':
      return fieldValue !== condition.value
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(String(condition.value))
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > Number(condition.value)
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < Number(condition.value)
    default:
      return true
  }
}

/**
 * Filtra los steps visibles según las respuestas actuales.
 * Respeta bifurcaciones definidas en showIf.
 */
export function getVisibleSteps(
  steps: FormStep[],
  answers: Record<string, unknown>
): FormStep[] {
  return steps.filter((step) => evaluateShowIf(step.showIf, answers))
}

/**
 * Calcula el progreso como porcentaje (0-100).
 */
export function getProgress(
  currentIndex: number,
  totalVisible: number
): number {
  if (totalVisible <= 1) return 100
  return Math.round((currentIndex / (totalVisible - 1)) * 100)
}
