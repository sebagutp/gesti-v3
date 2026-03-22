export type Feature =
  | 'contratos_ilimitados'
  | 'liquidaciones_ilimitadas'
  | 'pdf_descarga'
  | 'whatsapp_bot'
  | 'multi_contrato'

/* eslint-disable @typescript-eslint/no-unused-vars */
export async function checkPlanAccess(
  userId: string,
  feature: Feature
): Promise<{ allowed: boolean; reason?: string }> {
  // FASE 1: siempre true (early access)
  // FASE 6 (Sprint 3): implementar lógica real de planes consultando user_billing
  return { allowed: true }
}
/* eslint-enable @typescript-eslint/no-unused-vars */
