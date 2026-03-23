import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/common'

interface Permiso {
  id: string
  contrato_id: string
  user_id: string
  tipo: 'vacaciones' | 'licencia_enfermedad' | 'licencia_parental' | 'permiso_sin_pago'
  fecha_inicio: string
  fecha_fin: string
  notas?: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  created_at: string
  updated_at: string
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
      .from('permisos')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha_inicio', { ascending: false })

    if (error) {
      return Response.json({
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data as Permiso[],
    } satisfies ApiResponse<Permiso[]>)
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
    const { contrato_id, tipo, fecha_inicio, fecha_fin, notas } = body

    if (!contrato_id || !tipo || !fecha_inicio || !fecha_fin) {
      return Response.json({
        success: false,
        error: { code: 'CAMPOS_REQUERIDOS', message: 'contrato_id, tipo, fecha_inicio y fecha_fin son requeridos' },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    const { data, error } = await supabase
      .from('permisos')
      .insert({
        contrato_id,
        user_id: user.id,
        tipo,
        fecha_inicio,
        fecha_fin,
        notas: notas || null,
        estado: 'pendiente',
      })
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
      data: data as Permiso,
    } satisfies ApiResponse<Permiso>, { status: 201 })
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
