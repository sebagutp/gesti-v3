// ============================================================
// POST /api/cron/update-indicadores
// HU-300 — Sprint 3, Rama A
//
// Trigger para la Edge Function update-indicadores.
// Se invoca vía pg_cron (HU-302) o manualmente.
// Autenticación: CRON_SECRET en header Authorization.
// ============================================================

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json(
      { success: false, error: { code: 'NO_AUTH', message: 'Cron secret inválido' } },
      { status: 401 }
    )
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Invoke the Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-indicadores`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trigger: 'cron' }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('[cron/update-indicadores] Edge Function error:', result)
      return Response.json(
        { success: false, error: { code: 'EDGE_FUNCTION_ERROR', message: result.error || 'Error en Edge Function' } },
        { status: response.status }
      )
    }

    // Log the trigger in the database
    const supabase = createAdminClient()
    await supabase.from('indicadores_actualizacion_log').insert({
      mes_anterior: null,
      mes_nuevo: result.mes,
      cambios: {
        trigger: 'cron-api',
        edge_function_result: result,
      },
      actualizado_por: 'cron:update-indicadores',
    })

    return Response.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error invocando Edge Function'
    console.error('[cron/update-indicadores] Error:', message)
    return Response.json(
      { success: false, error: { code: 'CRON_ERROR', message } },
      { status: 500 }
    )
  }
}
