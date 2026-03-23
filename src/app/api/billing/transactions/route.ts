import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const { data: transactions, error } = await supabase
      .from('billing_transactions')
      .select('id, buy_order, plan_type, amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Transactions query error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'QUERY_ERROR', message: 'Error al consultar transacciones' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: transactions || [],
    })
  } catch (error) {
    console.error('Transactions error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'TRANSACTIONS_ERROR', message: 'Error al obtener historial de pagos' } },
      { status: 500 }
    )
  }
}
