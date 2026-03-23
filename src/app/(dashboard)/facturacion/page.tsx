export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    current: true,
  },
  {
    id: 'pro_mensual',
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
  },
  {
    id: 'pro_anual',
    name: 'Pro Anual',
    price: '$95.040',
    period: '/año',
    features: [
      'Todo lo de Pro Mensual',
      'Ahorro de 20%',
      'Equivale a $7.920/mes',
    ],
  },
]

export default async function FacturacionPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const currentPlan = profile?.plan || 'free'

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gesti-dark mb-2">Facturación</h1>
      <p className="text-sm text-gray-500 mb-8">
        Tu plan actual: <span className="font-semibold text-gesti-teal">{plans.find(p => p.id === currentPlan)?.name || 'Free'}</span>
      </p>

      <div className="grid md:grid-cols-3 gap-4">
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
              <button
                disabled={isCurrent}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : plan.highlighted
                      ? 'bg-gesti-verde text-white hover:bg-gesti-verde/90'
                      : 'bg-gesti-teal text-white hover:bg-gesti-teal/90'
                }`}
              >
                {isCurrent ? 'Plan actual' : 'Próximamente'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        La integración con Stripe se habilitará en Sprint 3.
      </p>
    </div>
  )
}
