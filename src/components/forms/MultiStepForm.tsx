'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { validateStepValue } from '@/lib/forms/validation'
import { getVisibleSteps, getProgress } from '@/lib/forms/engine'
import type { FormStep } from '@/lib/types/forms'
import { StepField } from './StepField'

interface MultiStepFormProps {
  steps: FormStep[]
  onComplete: (answers: Record<string, unknown>) => void
  onSave?: (answers: Record<string, unknown>) => void
  title?: string
  description?: string
  autoSave?: boolean
  showProgress?: boolean
  storageKey?: string
}

const DIRECTION_FORWARD = 1
const DIRECTION_BACK = -1

export function MultiStepForm({
  steps,
  onComplete,
  onSave,
  title,
  description,
  autoSave = true,
  showProgress = true,
  storageKey,
}: MultiStepFormProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState(DIRECTION_FORWARD)
  const [hydrated, setHydrated] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null)

  // Restore from localStorage
  useEffect(() => {
    if (!storageKey) {
      setHydrated(true)
      return
    }
    try {
      const saved = localStorage.getItem(`form_${storageKey}_draft`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setAnswers(parsed.answers ?? {})
        setCurrentIndex(parsed.currentIndex ?? 0)
      }
    } catch {
      // ignore corrupt data
    }
    setHydrated(true)
  }, [storageKey])

  // Auto-save to localStorage
  useEffect(() => {
    if (!autoSave || !storageKey || !hydrated) return
    try {
      localStorage.setItem(
        `form_${storageKey}_draft`,
        JSON.stringify({ answers, currentIndex })
      )
    } catch {
      // storage full — ignore
    }
  }, [answers, currentIndex, autoSave, storageKey, hydrated])

  const visibleSteps = getVisibleSteps(steps, answers)
  const safeIndex = Math.min(currentIndex, visibleSteps.length - 1)
  const currentStep = visibleSteps[safeIndex]
  const progress = getProgress(safeIndex, visibleSteps.length)
  const isFirst = safeIndex === 0
  const isLast = safeIndex === visibleSteps.length - 1

  // Focus input on step change
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(timer)
  }, [safeIndex])

  const setValue = useCallback(
    (value: unknown) => {
      if (!currentStep) return
      setAnswers((prev) => ({ ...prev, [currentStep.id]: value }))
      setError(null)
    },
    [currentStep]
  )

  const goNext = useCallback(() => {
    if (!currentStep) return

    const validationError = validateStepValue(currentStep, answers[currentStep.id])
    if (validationError) {
      setError(validationError)
      return
    }

    if (isLast) {
      if (storageKey) {
        try { localStorage.removeItem(`form_${storageKey}_draft`) } catch {}
      }
      onSave?.(answers)
      onComplete(answers)
      return
    }

    setDirection(DIRECTION_FORWARD)
    setError(null)
    setCurrentIndex(safeIndex + 1)
  }, [currentStep, answers, isLast, safeIndex, onComplete, onSave, storageKey])

  const goBack = useCallback(() => {
    if (isFirst) return
    setDirection(DIRECTION_BACK)
    setError(null)
    setCurrentIndex(safeIndex - 1)
  }, [isFirst, safeIndex])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Don't hijack Enter in textarea
        if (currentStep?.type === 'textarea') return
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, currentStep])

  if (!hydrated) return null
  if (!currentStep) return null

  const slideVariants = {
    enter: (d: number) => ({ y: d > 0 ? 40 : -40, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (d: number) => ({ y: d > 0 ? -40 : 40, opacity: 0 }),
  }

  // Section label
  const sectionChanged =
    safeIndex === 0 ||
    currentStep.section !== visibleSteps[safeIndex - 1]?.section

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Header */}
      {(title || showProgress) && (
        <div className="mb-8">
          {title && (
            <h1 className="text-xl font-semibold text-gesti-dark mb-1">{title}</h1>
          )}
          {description && (
            <p className="text-sm text-gray-500 mb-4">{description}</p>
          )}
          {showProgress && (
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gesti-verde rounded-full"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              />
            </div>
          )}
          {showProgress && (
            <p className="text-xs text-gray-400 mt-1.5 text-right">
              {safeIndex + 1} de {visibleSteps.length}
            </p>
          )}
        </div>
      )}

      {/* Step content */}
      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Section label */}
            {currentStep.section && sectionChanged && (
              <p className="text-xs font-medium text-gesti-verde uppercase tracking-wider mb-2">
                {currentStep.section}
              </p>
            )}

            {/* Question */}
            <label htmlFor={`field-${currentStep.id}`} className="block text-lg font-medium text-gesti-dark mb-4">
              {currentStep.label}
            </label>

            {/* Field */}
            <StepField
              step={currentStep}
              value={answers[currentStep.id]}
              onChange={setValue}
              ref={inputRef}
            />

            {/* Helper text */}
            {currentStep.helperText && !error && (
              <p className="text-xs text-gray-400 mt-2">{currentStep.helperText}</p>
            )}

            {/* Error */}
            <div aria-live="polite">
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 mt-2"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={isFirst}
          className="text-gray-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Atrás
        </Button>

        <Button onClick={goNext}>
          {isLast ? (
            <>
              Finalizar
              <Check className="h-4 w-4 ml-1.5" />
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>

      {/* Enter hint */}
      {currentStep.type !== 'textarea' && (
        <p className="text-center text-xs text-gray-300 mt-4">
          Presiona <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[10px]">Enter ↵</kbd> para continuar
        </p>
      )}
    </div>
  )
}
