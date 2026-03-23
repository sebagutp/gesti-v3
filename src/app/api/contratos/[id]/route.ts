import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/contratos/[id] — Obtiene un contrato por ID
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ success: false, error: { code: 'NO_AUTH', message: 'No autenticado' } }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Contrato no encontrado' } }, { status: 404 })
  }

  return Response.json({ success: true, data })
}

/**
 * POST /api/contratos/[id] — Actualiza un contrato existente
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ success: false, error: { code: 'NO_AUTH', message: 'No autenticado' } }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ success: false, error: { code: 'JSON_INVALIDO', message: 'JSON inválido' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('contratos')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return Response.json({ success: false, error: { code: 'DB_ERROR', message: error?.message || 'Error actualizando contrato' } }, { status: 500 })
  }

  return Response.json({ success: true, data })
}
