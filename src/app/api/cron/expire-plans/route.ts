import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Mark plans as expired where end_date has passed and status is still active
  const { data, error } = await supabase
    .from('user_billing')
    .update({
      plan_status: 'expired',
      updated_at: now,
    })
    .eq('plan_status', 'active')
    .neq('plan_type', 'free')
    .lt('end_date', now)
    .select('user_id, plan_type')

  if (error) {
    console.error('Expire plans error:', error)
    return NextResponse.json({ error: 'Failed to expire plans' }, { status: 500 })
  }

  const expiredCount = data?.length || 0

  if (expiredCount > 0) {
    console.log(`Expired ${expiredCount} plans:`, data?.map(d => d.user_id))
  }

  return NextResponse.json({
    success: true,
    expired_count: expiredCount,
    timestamp: now,
  })
}
