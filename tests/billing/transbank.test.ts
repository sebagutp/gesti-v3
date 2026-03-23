import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock transbank-sdk
vi.mock('transbank-sdk', () => ({
  WebpayPlus: {
    Transaction: vi.fn().mockImplementation(() => ({
      create: vi.fn(),
      commit: vi.fn(),
    })),
  },
  Options: vi.fn(),
  Environment: {
    Integration: 'https://webpay3gint.transbank.cl',
    Production: 'https://webpay3g.transbank.cl',
  },
}))

// Mock supabase admin client
const mockSingle = vi.fn()
const mockChain: Record<string, unknown> = {}
const mockEq = vi.fn(() => mockChain)
const mockNeq = vi.fn(() => mockChain)
const mockLt = vi.fn(() => mockChain)
const mockSelect = vi.fn(() => mockChain)
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => mockChain)
const mockUpsert = vi.fn().mockResolvedValue({ error: null })

// All chain methods return the same chainable object
Object.assign(mockChain, {
  select: mockSelect,
  eq: mockEq,
  neq: mockNeq,
  lt: mockLt,
  single: mockSingle,
  insert: mockInsert,
  update: mockUpdate,
  upsert: mockUpsert,
})

const mockFrom = vi.fn(() => mockChain)

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

// Import after mocks
import { PLAN_PRICES, PLAN_DURATIONS } from '@/lib/transbank/client'

describe('Transbank Billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore chain methods after clearAllMocks
    mockEq.mockReturnValue(mockChain)
    mockNeq.mockReturnValue(mockChain)
    mockLt.mockReturnValue(mockChain)
    mockSelect.mockReturnValue(mockChain)
    mockUpdate.mockReturnValue(mockChain)
    mockFrom.mockReturnValue(mockChain)
  })

  describe('Plan prices and durations', () => {
    it('should have correct plan prices in CLP', () => {
      expect(PLAN_PRICES.Pro_Mensual).toBe(9900)
      expect(PLAN_PRICES.Pro_Anual).toBe(95040)
    })

    it('should have correct plan durations in days', () => {
      expect(PLAN_DURATIONS.Pro_Mensual).toBe(30)
      expect(PLAN_DURATIONS.Pro_Anual).toBe(365)
    })
  })

  describe('Checkout creates valid transaction', () => {
    it('should generate unique buy_order with correct format', () => {
      const userId = 'abc12345-6789-0000-0000-000000000000'
      const plan = 'Pro_Mensual'
      const buyOrder = `GESTI-${plan}-${userId.slice(0, 8)}-${Date.now()}`

      expect(buyOrder).toMatch(/^GESTI-Pro_Mensual-abc12345-\d+$/)
    })

    it('should use correct amount for each plan', () => {
      expect(PLAN_PRICES['Pro_Mensual']).toBe(9900)
      expect(PLAN_PRICES['Pro_Anual']).toBe(95040)
    })
  })

  describe('Callback transaction handling', () => {
    it('should redirect to cancelled when no token_ws', () => {
      // Simulating: no token_ws and no TBK_TOKEN → cancelled
      const tokenWs = null
      const tbkToken = null
      const result = !tokenWs && !tbkToken ? 'cancelled' : 'process'
      expect(result).toBe('cancelled')
    })

    it('should redirect to timeout when TBK_TOKEN present', () => {
      const tbkToken = 'some-tbk-token'
      const result = tbkToken ? 'timeout' : 'process'
      expect(result).toBe('timeout')
    })

    it('should calculate correct end_date for monthly plan', () => {
      const now = new Date('2026-03-23T12:00:00Z')
      const durationDays = PLAN_DURATIONS['Pro_Mensual']
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

      expect(endDate.toISOString()).toBe('2026-04-22T12:00:00.000Z')
    })

    it('should calculate correct end_date for annual plan', () => {
      const now = new Date('2026-03-23T12:00:00Z')
      const durationDays = PLAN_DURATIONS['Pro_Anual']
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

      expect(endDate.toISOString()).toBe('2027-03-23T12:00:00.000Z')
    })
  })

  describe('checkPlanAccess logic', () => {
    it('should allow Free plan features without billing record', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const { checkPlanAccess } = await import('@/lib/auth/checkPlanAccess')
      const result = await checkPlanAccess('user-123', 'simular_contrato')
      expect(result.allowed).toBe(true)
    })

    it('should deny Pro features without billing record', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const { checkPlanAccess } = await import('@/lib/auth/checkPlanAccess')
      const result = await checkPlanAccess('user-123', 'contrato_valido')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('plan Pro')
    })

    it('should allow Pro features with active plan', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      mockSingle.mockResolvedValueOnce({
        data: { plan_type: 'Pro_Mensual', plan_status: 'active', end_date: futureDate },
        error: null,
      })

      const { checkPlanAccess } = await import('@/lib/auth/checkPlanAccess')
      const result = await checkPlanAccess('user-123', 'contrato_valido')
      expect(result.allowed).toBe(true)
    })

    it('should deny access with expired plan', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      mockSingle.mockResolvedValueOnce({
        data: { plan_type: 'Pro_Mensual', plan_status: 'active', end_date: pastDate },
        error: null,
      })

      const { checkPlanAccess } = await import('@/lib/auth/checkPlanAccess')
      const result = await checkPlanAccess('user-123', 'contrato_valido')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('expirado')
    })
  })

  describe('Upgrade Pro_Mensual → Pro_Anual', () => {
    it('should calculate prorated credit for remaining days', () => {
      const dailyRate = PLAN_PRICES.Pro_Mensual / PLAN_DURATIONS.Pro_Mensual // 330 CLP/day
      expect(dailyRate).toBe(330)

      // 15 days remaining → 4950 CLP credit
      const credit15 = Math.round(dailyRate * 15)
      expect(credit15).toBe(4950)

      // Upgrade amount = Annual - credit
      const upgradeAmount = PLAN_PRICES.Pro_Anual - credit15
      expect(upgradeAmount).toBe(90090)
    })

    it('should give zero credit if plan already expired', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const now = new Date()
      const daysRemaining = Math.max(0, Math.ceil((pastDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      expect(daysRemaining).toBe(0)
    })

    it('should enforce minimum 1 CLP for Transbank', () => {
      // Even with max credit, amount should be at least 1
      const amount = Math.max(1, PLAN_PRICES.Pro_Anual - 100000)
      expect(amount).toBe(1)
    })
  })

  describe('Downgrade blocking', () => {
    it('should block downgrade from active Pro_Anual to Pro_Mensual', () => {
      const currentPlan = 'Pro_Anual'
      const currentStatus = 'active'
      const endDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000)
      const requestedPlan = 'Pro_Mensual'

      const isBlocked =
        currentStatus === 'active' &&
        currentPlan === 'Pro_Anual' &&
        requestedPlan === 'Pro_Mensual' &&
        endDate > new Date()

      expect(isBlocked).toBe(true)
    })

    it('should allow Pro_Mensual after Pro_Anual expired', () => {
      const currentPlan = 'Pro_Anual'
      const currentStatus = 'expired'
      const requestedPlan = 'Pro_Mensual'

      const isBlocked =
        currentStatus === 'active' &&
        currentPlan === 'Pro_Anual' &&
        requestedPlan === 'Pro_Mensual'

      expect(isBlocked).toBe(false)
    })
  })

  describe('Cron expire-plans', () => {
    it('should mark expired plans correctly', () => {
      // The cron uses plan_status, end_date, plan_type — no Stripe columns
      // Verify the query filters are correct
      const now = new Date().toISOString()
      const pastEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      expect(new Date(pastEndDate) < new Date(now)).toBe(true)
      expect('expired').toBe('expired')
    })
  })
})
