// ============================================================
// GET/PATCH /api/liquidaciones/[id] — Individual liquidación
// Rama B — HU-22
// ============================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/common'
import type { Liquidacion } from '@/lib/types/liquidacion'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================================
// GET /api/liquidaciones/[id]
// ============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTENTICADO', message: 'Debe estar autenticado' },
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
        error: { code: 'NO_ENCONTRADA', message: 'Liquidación no encontrada' },
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

// ============================================================
// PATCH /api/liquidaciones/[id] — Actualizar estado
// ============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTENTICADO', message: 'Debe estar autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const body = await request.json()

    const allowedFields = ['estado', 'pdf_liquidacion_url', 'pdf_resumen_url']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({
        success: false,
        error: { code: 'SIN_CAMBIOS', message: 'No se proporcionaron campos válidos para actualizar' },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('liquidaciones')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return Response.json({
        success: false,
        error: { code: 'NO_ENCONTRADA', message: 'Liquidación no encontrada' },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    return Response.json({
      success: true,
      data: data as Liquidacion,
    } satisfies ApiResponse<Liquidacion>)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({
        success: false,
        error: { code: 'JSON_INVALIDO', message: 'El body debe ser JSON válido' },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
