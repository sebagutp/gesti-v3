'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface BillingPlan {
  plan_type: string
  plan_status: string
  start_date: string | null
  end_date: string | null
  has_subscription: boolean
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
    stripePlan: 'Pro_Mensual' as const,
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
    stripePlan: 'Pro_Anual' as const,
  },
]

export default function FacturacionPage() {
  const [billing, setBilling] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

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

  async function handleCheckout(plan: 'Pro_Mensual' | 'Pro_Anual') {
    setCheckoutLoading(plan)
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
      if (json.success && json.data.url) {
        window.location.href = json.data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (json.success && json.data.url) {
        window.location.href = json.data.url
      }
    } catch (err) {
      console.error('Portal error:', err)
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
      <p className="text-sm text-gray-500 mb-2">
        Tu plan actual: <span className="font-semibold text-gesti-teal">
          {plans.find(p => p.id === currentPlan)?.name || 'Free'}
        </span>
        {billing?.plan_status === 'active' && billing?.end_date && (
          <span className="text-gray-400 ml-2">
            (vigente hasta {formatDate(billing.end_date)})
          </span>
        )}
        {billing?.plan_status === 'cancelled' && (
          <span className="text-red-400 ml-2">(cancelado)</span>
        )}
        {billing?.plan_status === 'expired' && (
          <span className="text-orange-400 ml-2">(expirado)</span>
        )}
      </p>

      {billing?.has_subscription && (
        <button
          onClick={handlePortal}
          className="text-sm text-gesti-teal underline mb-6 block"
        >
          Gestionar suscripción en Stripe
        </button>
      )}

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan
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
              {plan.stripePlan ? (
                <button
                  disabled={isCurrent || checkoutLoading !== null}
                  onClick={() => handleCheckout(plan.stripePlan!)}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : plan.highlighted
                        ? 'bg-gesti-verde text-white hover:bg-gesti-verde/90'
                        : 'bg-gesti-teal text-white hover:bg-gesti-teal/90'
                  }`}
                >
                  {isCurrent
                    ? 'Plan actual'
                    : checkoutLoading === plan.stripePlan
                      ? 'Redirigiendo...'
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
