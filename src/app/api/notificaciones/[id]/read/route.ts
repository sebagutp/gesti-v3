import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/common'

export async function POST(
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

    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return Response.json({
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
