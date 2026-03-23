import type { FormStep } from '@/lib/types/forms'

/**
 * Steps del simulador de liquidación — público, sin login.
 * Campos mínimos para simular. 100% serializable.
 */
export const simuladorSteps: FormStep[] = [
  {
    id: 'sueldo_base',
    type: 'number',
    label: '¿Cuánto es el sueldo pactado?',
    placeholder: '539000',
    helperText: 'Sueldo mínimo TCP 2026: $539.000',
    validation: { required: true, min: 1 },
    section: 'Sueldo',
  },
  {
    id: 'tipo_sueldo',
    type: 'radio',
    label: '¿Ese sueldo es líquido, imponible o bruto?',
    options: [
      { value: 'liquido', label: 'Líquido — Lo que recibe en la mano' },
      { value: 'imponible', label: 'Imponible — Antes de descuentos legales' },
      { value: 'bruto', label: 'Bruto — Incluye todo' },
    ],
    validation: { required: true },
    helperText: 'Si no estás seguro, elige "Líquido"',
    section: 'Sueldo',
  },
  {
    id: 'afp',
    type: 'select',
    label: '¿En qué AFP está afiliado/a?',
    placeholder: 'Selecciona AFP...',
    options: [
      { value: 'Capital', label: 'Capital' },
      { value: 'Cuprum', label: 'Cuprum' },
      { value: 'Habitat', label: 'Habitat' },
      { value: 'PlanVital', label: 'PlanVital' },
      { value: 'Provida', label: 'Provida' },
      { value: 'Modelo', label: 'Modelo' },
      { value: 'Uno', label: 'Uno' },
    ],
    validation: { required: true },
    section: 'Previsión',
  },
  {
    id: 'es_pensionado',
    type: 'radio',
    label: '¿El trabajador/a es pensionado/a?',
    options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Sí, es pensionado/a' },
    ],
    validation: { required: true },
    section: 'Previsión',
  },
  {
    id: 'dias_trabajados',
    type: 'number',
    label: '¿Cuántos días trabajó este mes?',
    placeholder: '30',
    validation: { required: true, min: 1, max: 30 },
    section: 'Trabajo',
  },
  {
    id: 'horas_extra',
    type: 'number',
    label: '¿Horas extra trabajadas? (opcional)',
    placeholder: '0',
    helperText: 'Se pagan al 50% de recargo',
    validation: { required: false, min: 0, max: 100 },
    section: 'Trabajo',
  },
  {
    id: 'cargas_familiares',
    type: 'number',
    label: '¿Cuántas cargas familiares tiene? (opcional)',
    placeholder: '0',
    validation: { required: false, min: 0, max: 20 },
    section: 'Beneficios',
  },
  {
    id: 'colacion',
    type: 'number',
    label: 'Bono de colación mensual (opcional)',
    placeholder: '0',
    helperText: 'Monto no imponible para alimentación',
    validation: { required: false, min: 0 },
    section: 'Beneficios',
  },
  {
    id: 'movilizacion',
    type: 'number',
    label: 'Bono de movilización mensual (opcional)',
    placeholder: '0',
    helperText: 'Monto no imponible para transporte',
    validation: { required: false, min: 0 },
    section: 'Beneficios',
  },
]
