import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/common'
import type { Liquidacion } from '@/lib/types/liquidacion'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTH', message: 'No autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const { data, error } = await supabase
      .from('liquidaciones')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return Response.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Liquidación no encontrada' },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    return Response.json({
      success: true,
      data: data as Liquidacion,
    } satisfies ApiResponse<Liquidacion>)
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
