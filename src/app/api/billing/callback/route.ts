import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { webpayTransaction, PLAN_DURATIONS } from '@/lib/transbank/client'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenWs = searchParams.get('token_ws')
  const tbkToken = searchParams.get('TBK_TOKEN')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // User cancelled the payment
  if (!tokenWs && !tbkToken) {
    return NextResponse.redirect(`${appUrl}/facturacion?status=cancelled`)
  }

  // Timeout / abort by Transbank
  if (tbkToken) {
    return NextResponse.redirect(`${appUrl}/facturacion?status=timeout`)
  }

  const supabase = createAdminClient()

  try {
    // Commit the transaction with Transbank
    const response = await webpayTransaction.commit(tokenWs!)

    const buyOrder = response.buy_order

    // Find the pending transaction
    const { data: transaction } = await supabase
      .from('billing_transactions')
      .select('user_id, plan_type')
      .eq('buy_order', buyOrder)
      .eq('status', 'pending')
      .single()

    if (!transaction) {
      console.error('No pending transaction found for buy_order:', buyOrder)
      return NextResponse.redirect(`${appUrl}/facturacion?status=rejected`)
    }

    // Check if transaction was approved (response_code 0 = approved)
    if (response.response_code !== 0) {
      // Rejected
      await supabase.from('billing_transactions').update({
        status: 'rejected',
        tbk_response: response,
      }).eq('buy_order', buyOrder)

      return NextResponse.redirect(`${appUrl}/facturacion?status=rejected`)
    }

    // Approved — activate plan
    const now = new Date()
    const durationDays = PLAN_DURATIONS[transaction.plan_type] || 30
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

    // Update billing_transactions
    await supabase.from('billing_transactions').update({
      status: 'approved',
      tbk_response: response,
    }).eq('buy_order', buyOrder)

    // Upsert user_billing
    await supabase.from('user_billing').upsert({
      user_id: transaction.user_id,
      plan_type: transaction.plan_type,
      plan_status: 'active',
      tbk_order_id: buyOrder,
      tbk_token: tokenWs,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.redirect(`${appUrl}/facturacion/success`)
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${appUrl}/facturacion?status=rejected`)
  }
}
