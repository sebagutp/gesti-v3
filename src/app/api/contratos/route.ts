import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

/**
 * GET /api/contratos — Lista contratos del usuario autenticado (RLS)
 */
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ success: false, error: { code: 'NO_AUTH', message: 'No autenticado' } }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return Response.json({ success: true, data })
}

/**
 * POST /api/contratos — Crea un nuevo contrato
 */
export async function POST(req: NextRequest) {
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

  const token = randomUUID()

  const { data, error } = await supabase
    .from('contratos')
    .insert({
      ...body,
      user_id: user.id,
      estado: 'borrador',
      token,
      vigente: true,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return Response.json({ success: true, data }, { status: 201 })
}
