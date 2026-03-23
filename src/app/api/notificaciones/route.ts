import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/common'

interface Notificacion {
  id: string
  user_id: string
  titulo: string
  mensaje: string
  tipo: 'info' | 'warning' | 'success' | 'error'
  leida: boolean
  created_at: string
}

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
      .from('notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return Response.json({
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data as Notificacion[],
    } satisfies ApiResponse<Notificacion[]>)
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
