import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanType } from '@/lib/types/common'

export type Feature =
  | 'contratos_ilimitados'
  | 'liquidaciones_ilimitadas'
  | 'pdf_descarga'
  | 'whatsapp_bot'
  | 'multi_contrato'

const PLAN_FEATURES: Record<PlanType, Feature[]> = {
  Free: [],
  Pro_Mensual: [
    'contratos_ilimitados',
    'liquidaciones_ilimitadas',
    'pdf_descarga',
    'multi_contrato',
  ],
  Pro_Anual: [
    'contratos_ilimitados',
    'liquidaciones_ilimitadas',
    'pdf_descarga',
    'multi_contrato',
    'whatsapp_bot',
  ],
}

export async function checkPlanAccess(
  userId: string,
  feature: Feature
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient()

  const { data: billing, error } = await supabase
    .from('user_billing')
    .select('plan_type, plan_status, end_date')
    .eq('user_id', userId)
    .single()

  if (error || !billing) {
    // No billing record = Free plan
    return {
      allowed: false,
      reason: 'Necesitas un plan Pro para acceder a esta función.',
    }
  }

  const planType = billing.plan_type as PlanType

  // Check plan is active
  if (billing.plan_status !== 'active') {
    return {
      allowed: false,
      reason: `Tu plan ${planType} está ${billing.plan_status}. Renueva para continuar.`,
    }
  }

  // Check plan hasn't expired
  if (billing.end_date && new Date(billing.end_date) < new Date()) {
    return {
      allowed: false,
      reason: 'Tu plan ha expirado. Renueva para continuar.',
    }
  }

  // Check feature access
  const features = PLAN_FEATURES[planType] || []
  if (!features.includes(feature)) {
    return {
      allowed: false,
      reason: `La función "${feature}" no está disponible en tu plan ${planType}.`,
    }
  }

  return { allowed: true }
}
