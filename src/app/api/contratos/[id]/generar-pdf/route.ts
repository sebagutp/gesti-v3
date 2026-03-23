import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generarContratoPDF } from '@/lib/pdf/generar-contrato'
import { enviarEmailContrato } from '@/lib/email/resend'
import type { Contrato } from '@/lib/types/contrato'

/**
 * POST /api/contratos/[id]/generar-pdf
 *
 * Genera el PDF del contrato, lo sube a Supabase Storage,
 * actualiza el estado del contrato y envía email al trabajador y empleador.
 *
 * Response: { pdf_url: string; estado: 'enviado' }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json(
      { success: false, error: { code: 'NO_AUTH', message: 'No autenticado' } },
      { status: 401 }
    )
  }

  // Fetch contrato
  const { data: contrato, error: fetchError } = await supabase
    .from('contratos')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !contrato) {
    return Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Contrato no encontrado' } },
      { status: 404 }
    )
  }

  const c = contrato as Contrato

  try {
    // Map contrato data to template variables
    const variables = mapContratoToVariables(c)

    // Generate PDF and upload to Storage
    const pdfUrl = await generarContratoPDF(c.id, variables)

    // Update contrato with PDF URL and estado
    const { error: updateError } = await supabase
      .from('contratos')
      .update({
        pdf_url: pdfUrl,
        estado: 'generado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error actualizando contrato:', updateError)
    }

    // Insert notification
    try {
      await supabase.from('notificaciones').insert({
        user_id: user.id,
        tipo: 'success',
        titulo: 'Contrato generado',
        mensaje: `El contrato de ${c.nombre_trabajador} ${c.apellidos_trabajador} ha sido generado exitosamente.`,
        leida: false,
      })
    } catch {
      // non-blocking
    }

    // Send email to worker and employer
    try {
      await enviarEmailContrato(
        {
          id: c.id,
          nombre_trabajador: `${c.nombre_trabajador} ${c.apellidos_trabajador}`,
          razon_social: c.razon_social,
          email_trabajador: c.email_trabajador,
          email_empleador: c.email_empleador,
          token: c.token,
        },
        pdfUrl
      )

      // Update estado to 'enviado' after successful email
      await supabase
        .from('contratos')
        .update({ estado: 'enviado', updated_at: new Date().toISOString() })
        .eq('id', id)
    } catch (emailError) {
      console.error('Error enviando email contrato:', emailError)
      // PDF was generated successfully, email failed - don't fail the whole request
    }

    return Response.json({
      success: true,
      data: { pdf_url: pdfUrl, estado: 'enviado' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generando PDF'
    return Response.json(
      { success: false, error: { code: 'PDF_ERROR', message } },
      { status: 500 }
    )
  }
}

/**
 * Maps a Contrato record to the template variables expected by contrato_tcp.html
 */
function mapContratoToVariables(c: Contrato): Record<string, unknown> {
  return {
    // Empleador
    nombres_empleador: c.nombre_empleador,
    apellidos_empleador: '',
    rut_empleador: c.rut_empresa,
    direccion_empleador: c.domicilio_empleador,
    correo_empleador: c.email_empleador,

    // Trabajador
    nombres_trabajador: c.nombre_trabajador,
    apellidos_trabajador: c.apellidos_trabajador,
    tipo_documento: c.tipo_documento,
    numero_documento: c.numero_documento,
    email_trabajador: c.email_trabajador,
    direccion_trabajador: c.domicilio_trabajador,
    nacionalidad: c.nacionalidad,

    // Contrato
    tipo_contrato: c.tipo_contrato,
    sueldo_base: c.sueldo_base,
    tipo_sueldo: c.tipo_sueldo,
    afp_trabajador: c.afp,
    fecha_inicio: c.fecha_inicio,
    fecha_termino: c.fecha_termino || '',

    // Beneficios
    gratificacion: c.gratificacion,
    asignacion_colacion: c.colacion,
    asignacion_movilizacion: c.movilizacion,

    // Booleanos para condicionales {{#if}}
    puertas_adentro: c.tipo_contrato === 'puertas_adentro',
    puertas_afuera: c.tipo_contrato === 'puertas_afuera',
    jornada_full: c.tipo_jornada === 'full',
    jornada_part: c.tipo_jornada === 'part',
    doc_rut: c.tipo_documento === 'rut',
    doc_pasaporte: c.tipo_documento === 'pasaporte',
    con_termino: !!c.fecha_termino,
  }
}
