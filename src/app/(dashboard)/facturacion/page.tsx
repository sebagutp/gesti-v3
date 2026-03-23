'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface BillingPlan {
  plan_type: string
  plan_status: string
  start_date: string | null
  end_date: string | null
  has_active_plan: boolean
  days_remaining: number | null
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    features: [
      'Simular contrato',
      'Simular liquidación',
    ],
  },
  {
    id: 'Pro_Mensual',
    name: 'Pro Mensual',
    price: '$9.900',
    period: '/mes',
    features: [
      'Contratos válidos ilimitados',
      'Liquidaciones con PDF',
      'Gestión de permisos',
      'Soporte prioritario',
    ],
    highlighted: true,
    planKey: 'Pro_Mensual' as const,
  },
  {
    id: 'Pro_Anual',
    name: 'Pro Anual',
    price: '$95.040',
    period: '/año',
    features: [
      'Todo lo de Pro Mensual',
      'Ahorro de 20%',
      'Equivale a $7.920/mes',
    ],
    planKey: 'Pro_Anual' as const,
  },
]

function FacturacionContent() {
  const searchParams = useSearchParams()
  const [billing, setBilling] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'cancelled') setToast('Pago cancelado por el usuario.')
    else if (status === 'rejected') setToast('Pago rechazado. Intenta con otro medio de pago.')
    else if (status === 'timeout') setToast('Tiempo agotado en el formulario de pago.')
  }, [searchParams])

  useEffect(() => {
    async function fetchPlan() {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch('/api/billing/plan', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        if (json.success) setBilling(json.data)
      } catch (err) {
        console.error('Error fetching plan:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [])

  const currentPlan = billing?.plan_type || 'free'
  const isExpiredOrExpiring = billing?.plan_status === 'expired' ||
    (billing?.days_remaining !== null && billing?.days_remaining !== undefined && billing.days_remaining < 7)

  async function handleCheckout(plan: 'Pro_Mensual' | 'Pro_Anual') {
    setCheckoutLoading(plan)
    setToast(null)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()
      if (json.success && json.data.url && json.data.token) {
        // Redirect to Webpay Plus with token
        window.location.href = `${json.data.url}?token_ws=${json.data.token}`
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setToast('Error al iniciar el pago. Intenta nuevamente.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-CL')
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gesti-dark mb-2">Facturación</h1>
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gesti-dark mb-2">Facturación</h1>

      {toast && (
        <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-700">
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-2">
        Tu plan actual: <span className="font-semibold text-gesti-teal">
          {plans.find(p => p.id === currentPlan)?.name || 'Free'}
        </span>
        {billing?.plan_status === 'active' && billing?.days_remaining !== null && billing.days_remaining > 0 && (
          <span className={`ml-2 ${billing.days_remaining < 7 ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
            ({billing.days_remaining} días restantes — vence {formatDate(billing.end_date)})
          </span>
        )}
        {billing?.plan_status === 'cancelled' && (
          <span className="text-red-400 ml-2">(cancelado)</span>
        )}
        {billing?.plan_status === 'expired' && (
          <span className="text-orange-400 ml-2">(expirado)</span>
        )}
      </p>

      {isExpiredOrExpiring && currentPlan !== 'free' && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
          {billing?.plan_status === 'expired'
            ? 'Tu plan ha expirado. Renueva para seguir usando las funciones Pro.'
            : `Tu plan vence en ${billing?.days_remaining} días. Renueva para no perder acceso.`}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan && billing?.plan_status === 'active'
          const canRenew = plan.id === currentPlan && isExpiredOrExpiring
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-gesti-verde bg-gesti-verde/5 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <span className="text-xs font-semibold text-gesti-verde uppercase tracking-wide mb-2">
                  Más popular
                </span>
              )}
              <h2 className="text-lg font-bold text-gesti-dark">{plan.name}</h2>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-gesti-dark">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-gesti-verde mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.planKey ? (
                <button
                  disabled={isCurrent || checkoutLoading !== null}
                  onClick={() => handleCheckout(plan.planKey!)}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : canRenew
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : plan.highlighted
                          ? 'bg-gesti-verde text-white hover:bg-gesti-verde/90'
                          : 'bg-gesti-teal text-white hover:bg-gesti-teal/90'
                  }`}
                >
                  {isCurrent
                    ? 'Plan actual'
                    : canRenew
                      ? 'Renovar plan'
                      : checkoutLoading === plan.planKey
                        ? 'Redirigiendo a Webpay...'
                        : 'Contratar'}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-default"
                >
                  {isCurrent ? 'Plan actual' : 'Plan gratuito'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function FacturacionPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gesti-dark mb-2">Facturación</h1>
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    }>
      <FacturacionContent />
    </Suspense>
  )
}
