import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanType, Feature } from '@/lib/types/common'

const PLAN_FEATURES: Record<PlanType, Feature[]> = {
  Free: ['simular_contrato', 'simular_liquidacion'],
  Pro_Mensual: [
    'simular_contrato',
    'simular_liquidacion',
    'contrato_valido',
    'liquidaciones',
    'pdf_generacion',
    'multi_contrato',
    'soporte',
  ],
  Pro_Anual: [
    'simular_contrato',
    'simular_liquidacion',
    'contrato_valido',
    'liquidaciones',
    'pdf_generacion',
    'multi_contrato',
    'soporte',
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
    const freeFeatures = PLAN_FEATURES.Free
    if (freeFeatures.includes(feature)) {
      return { allowed: true }
    }
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
    // Auto-mark as expired
    await supabase
      .from('user_billing')
      .update({ plan_status: 'expired', updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    return {
      allowed: false,
      reason: 'Tu plan ha expirado. Renueva para continuar.',
    }
  }

  // Check feature access
  const features = PLAN_FEATURES[planType] || PLAN_FEATURES.Free
  if (!features.includes(feature)) {
    return {
      allowed: false,
      reason: `La función "${feature}" no está disponible en tu plan ${planType}.`,
    }
  }

  return { allowed: true }
}
