/**
 * Tipos de formulario — 100% serializables (JSON.stringify/parse)
 * Reutilizables en WhatsApp bot runner (Sprint 3)
 */

export type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'textarea'
  | 'rut'
  | 'checkbox'

export interface FormFieldOption {
  value: string
  label: string
}

export interface FormValidation {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  patternMessage?: string
}

export interface FormShowIf {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'
  value: string | number | boolean
}

export interface FormStep {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  options?: FormFieldOption[]
  validation?: FormValidation
  showIf?: FormShowIf
  helperText?: string
  section?: string
}

export interface FormDefinition {
  id: string
  name: string
  steps: FormStep[]
  version: string
}
