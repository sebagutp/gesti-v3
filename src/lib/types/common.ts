// ============================================================
// Tipos Comunes — Gesti V3.1 (Rama B, inmutables en sprint)
// ============================================================

export type PlanType = 'Free' | 'Pro_Mensual' | 'Pro_Anual'

export type Feature =
  | 'simular_contrato'
  | 'simular_liquidacion'
  | 'contrato_valido'
  | 'liquidaciones'
  | 'pdf_generacion'
  | 'soporte'

export interface UserPlan {
  plan_type: PlanType
  plan_status: 'active' | 'expired' | 'cancelled'
  start_date: string
  end_date: string
  features: Feature[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    per_page: number
    pages: number
  }
}
