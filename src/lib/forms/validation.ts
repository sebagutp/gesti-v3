import { z, type ZodSchema } from 'zod'
import type { FormStep } from '@/lib/types/forms'

/**
 * Convierte la config serializable de validación a un schema Zod en runtime.
 * Esto permite que FormStep[] sea 100% JSON-serializable
 * mientras se usa Zod para validación real en el cliente.
 */
export function buildZodSchema(step: FormStep): ZodSchema {
  const v = step.validation
  const isRequired = v?.required !== false // required por defecto

  switch (step.type) {
    case 'number': {
      let schema = z.coerce.number({ invalid_type_error: 'Ingresa un número válido' })
      if (v?.min !== undefined) schema = schema.min(v.min, { message: `Mínimo ${v.min}` })
      if (v?.max !== undefined) schema = schema.max(v.max, { message: `Máximo ${v.max}` })
      if (!isRequired) return schema.optional().or(z.literal('').transform(() => undefined))
      return schema
    }

    case 'email': {
      const base = z.string().email('Ingresa un email válido')
      if (!isRequired) return base.optional().or(z.literal(''))
      return base.min(1, 'Este campo es obligatorio')
    }

    case 'rut': {
      const schema = z.string().regex(
        /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/,
        'Formato: 12.345.678-9'
      )
      if (!isRequired) return schema.optional().or(z.literal(''))
      return schema
    }

    case 'date': {
      const schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha')
      if (!isRequired) return schema.optional().or(z.literal(''))
      return schema
    }

    case 'checkbox': {
      if (isRequired) return z.literal(true, { errorMap: () => ({ message: 'Debes aceptar' }) })
      return z.boolean()
    }

    case 'select':
    case 'radio': {
      const schema = z.string()
      if (!isRequired) return schema.optional().or(z.literal(''))
      return schema.min(1, 'Selecciona una opción')
    }

    case 'multiselect': {
      const schema = z.array(z.string())
      if (isRequired) return schema.min(1, 'Selecciona al menos una opción')
      return schema
    }

    case 'textarea':
    case 'text':
    default: {
      let schema = z.string()
      if (v?.pattern) {
        schema = schema.regex(new RegExp(v.pattern), v.patternMessage ?? 'Formato inválido')
      }
      if (v?.min !== undefined) schema = schema.min(v.min, { message: `Mínimo ${v.min} caracteres` })
      if (v?.max !== undefined) schema = schema.max(v.max, { message: `Máximo ${v.max} caracteres` })
      if (!isRequired) return schema.optional().or(z.literal(''))
      return schema.min(1, 'Este campo es obligatorio')
    }
  }
}

/**
 * Valida un valor contra el schema generado para un step.
 * Retorna null si es válido, o el mensaje de error.
 */
export function validateStepValue(step: FormStep, value: unknown): string | null {
  const schema = buildZodSchema(step)
  const result = schema.safeParse(value)
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Valor inválido'
}
