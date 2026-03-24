'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'
import type { FormStep } from '@/lib/types/forms'

interface StepFieldProps {
  step: FormStep
  value: unknown
  onChange: (value: unknown) => void
}

const baseInputClass =
  'w-full px-4 py-3 text-base border rounded-lg bg-white text-gesti-dark placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gesti-verde/50 focus:border-gesti-verde transition-colors'

export const StepField = forwardRef<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  StepFieldProps
>(function StepField({ step, value, onChange }, ref) {
  const strValue = (value as string) ?? ''

  switch (step.type) {
    case 'text':
    case 'email':
    case 'date':
    case 'rut':
      return (
        <input
          id={`field-${step.id}`}
          ref={ref as React.Ref<HTMLInputElement>}
          type={step.type === 'rut' ? 'text' : step.type}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={step.placeholder}
          className={baseInputClass}
          autoComplete={step.type === 'email' ? 'email' : 'off'}
        />
      )

    case 'number':
      return (
        <input
          id={`field-${step.id}`}
          ref={ref as React.Ref<HTMLInputElement>}
          type="number"
          value={value !== undefined && value !== '' ? String(value) : ''}
          onChange={(e) => {
            const raw = e.target.value
            onChange(raw === '' ? '' : Number(raw))
          }}
          placeholder={step.placeholder}
          className={baseInputClass}
          inputMode="numeric"
        />
      )

    case 'textarea':
      return (
        <textarea
          id={`field-${step.id}`}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={step.placeholder}
          rows={4}
          className={cn(baseInputClass, 'resize-none')}
        />
      )

    case 'select':
      return (
        <select
          id={`field-${step.id}`}
          ref={ref as React.Ref<HTMLSelectElement>}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInputClass, 'appearance-none cursor-pointer')}
        >
          <option value="">{step.placeholder ?? 'Selecciona...'}</option>
          {step.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )

    case 'radio':
      return (
        <div className="space-y-2" role="radiogroup" aria-label={step.label}>
          {step.options?.map((opt) => (
            <label
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors',
                strValue === opt.value
                  ? 'border-gesti-verde bg-gesti-verde/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <input
                type="radio"
                name={step.id}
                value={opt.value}
                checked={strValue === opt.value}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                  strValue === opt.value ? 'border-gesti-verde' : 'border-gray-300'
                )}
                aria-hidden="true"
              >
                {strValue === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-gesti-verde" />
                )}
              </div>
              <span className="text-gesti-dark">{opt.label}</span>
            </label>
          ))}
        </div>
      )

    case 'checkbox':
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-gesti-verde focus:ring-gesti-verde/50"
          />
          <span className="text-gesti-dark">{step.placeholder ?? step.label}</span>
        </label>
      )

    case 'multiselect':
      return (
        <div className="space-y-2">
          {step.options?.map((opt) => {
            const selected = Array.isArray(value) ? (value as string[]) : []
            const isSelected = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors',
                  isSelected
                    ? 'border-gesti-verde bg-gesti-verde/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    onChange(
                      isSelected
                        ? selected.filter((v) => v !== opt.value)
                        : [...selected, opt.value]
                    )
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-gesti-verde focus:ring-gesti-verde/50"
                />
                <span className="text-gesti-dark">{opt.label}</span>
              </label>
            )
          })}
        </div>
      )

    default:
      return (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          type="text"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={step.placeholder}
          className={baseInputClass}
        />
      )
  }
})
