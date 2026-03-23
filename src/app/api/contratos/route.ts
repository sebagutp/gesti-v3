import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/common'
import type { Contrato } from '@/lib/types/contrato'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTH', message: 'No autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data as Contrato[],
    } satisfies ApiResponse<Contrato[]>)
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTH', message: 'No autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('contratos')
      .insert({ ...body, user_id: user.id, estado: 'borrador' })
      .select()
      .single()

    if (error) {
      return Response.json({
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data as Contrato,
    } satisfies ApiResponse<Contrato>, { status: 201 })
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
