// ============================================================
// GET/POST /api/indicadores — CRUD indicadores previsionales
// Rama B — HU-21
// ============================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/common'
import type { IndicadoresPrevisionales } from '@/lib/types/liquidacion'
import { INDICADORES_MARZO_2026 } from '@/lib/calculos/liquidacion'

// ── Cache en memoria (TTL 5 minutos) ──
const cache = new Map<string, { data: IndicadoresPrevisionales; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

function getCached(mes: string): IndicadoresPrevisionales | null {
  const entry = cache.get(mes)
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data
  }
  cache.delete(mes)
  return null
}

function setCache(mes: string, data: IndicadoresPrevisionales): void {
  cache.set(mes, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ============================================================
// GET /api/indicadores?mes=2026-03
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const mes = request.nextUrl.searchParams.get('mes')

    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return Response.json({
        success: false,
        error: {
          code: 'MES_INVALIDO',
          message: 'Parámetro mes requerido en formato YYYY-MM',
        },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    // Check cache first
    const cached = getCached(mes)
    if (cached) {
      return Response.json({
        success: true,
        data: cached,
      } satisfies ApiResponse<IndicadoresPrevisionales>, {
        headers: { 'X-Cache': 'HIT' },
      })
    }

    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('indicadores_previsionales')
      .select('*')
      .eq('mes', mes)
      .single()

    if (error || !data) {
      // Fallback to hardcoded defaults for 2026-03
      if (mes === '2026-03') {
        setCache(mes, INDICADORES_MARZO_2026)
        return Response.json({
          success: true,
          data: INDICADORES_MARZO_2026,
        } satisfies ApiResponse<IndicadoresPrevisionales>, {
          headers: { 'X-Cache': 'DEFAULT' },
        })
      }

      return Response.json({
        success: false,
        error: {
          code: 'INDICADORES_NO_ENCONTRADOS',
          message: `No se encontraron indicadores para el mes ${mes}`,
        },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    const indicadores = data as IndicadoresPrevisionales
    setCache(mes, indicadores)

    return Response.json({
      success: true,
      data: indicadores,
    } satisfies ApiResponse<IndicadoresPrevisionales>, {
      headers: { 'X-Cache': 'MISS' },
    })
  } catch {
    return Response.json({
      success: false,
      error: {
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
      },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}

// ============================================================
// POST /api/indicadores — Crear/actualizar indicadores
// Solo usuarios autenticados (admin check delegado a RLS)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({
        success: false,
        error: {
          code: 'NO_AUTENTICADO',
          message: 'Debe estar autenticado para crear indicadores',
        },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const body = await request.json()

    // Validación básica
    if (!body.mes || !/^\d{4}-\d{2}$/.test(body.mes)) {
      return Response.json({
        success: false,
        error: {
          code: 'MES_INVALIDO',
          message: 'Campo mes requerido en formato YYYY-MM',
        },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    const requiredFields = ['uf', 'utm', 'sueldo_minimo_tcp', 'afp_tasas', 'tramos_iusc',
      'tope_afp', 'tope_cesantia', 'tasas', 'reforma', 'rli_exento_hasta']

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return Response.json({
          success: false,
          error: {
            code: 'CAMPO_REQUERIDO',
            message: `Campo requerido: ${field}`,
          },
        } satisfies ApiResponse<never>, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('indicadores_previsionales')
      .upsert({
        mes: body.mes,
        uf: body.uf,
        utm: body.utm,
        sueldo_minimo_tcp: body.sueldo_minimo_tcp,
        afp_tasas: body.afp_tasas,
        tramos_iusc: body.tramos_iusc,
        tope_afp: body.tope_afp,
        tope_cesantia: body.tope_cesantia,
        tasas: body.tasas,
        reforma: body.reforma,
        rli_exento_hasta: body.rli_exento_hasta,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'mes' })
      .select()
      .single()

    if (error) {
      return Response.json({
        success: false,
        error: {
          code: 'ERROR_DB',
          message: error.message,
        },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    // Invalidate cache for this month
    cache.delete(body.mes)

    return Response.json({
      success: true,
      data: data as IndicadoresPrevisionales,
    } satisfies ApiResponse<IndicadoresPrevisionales>, { status: 201 })

  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({
        success: false,
        error: {
          code: 'JSON_INVALIDO',
          message: 'El body debe ser JSON válido',
        },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    return Response.json({
      success: false,
      error: {
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
      },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
