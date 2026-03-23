import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/liquidaciones/[id] — Obtiene una liquidación por ID
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
    .from('liquidaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Liquidación no encontrada' } }, { status: 404 })
  }

  return Response.json({ success: true, data })
}
