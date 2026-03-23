/**
 * Funciones de envío de email transaccional — Gesti V3.1
 *
 * Usa Resend como provider. Los templates se renderizan con el mismo motor
 * de plantillas del módulo PDF (renderTemplate).
 *
 * 3 funciones exportadas:
 * - enviarEmailContrato()
 * - enviarEmailLiquidacion()
 * - enviarRecordatorioMensual()
 */

import { Resend } from 'resend';
import { renderTemplate } from '@/lib/pdf/render-template';
import {
  CONTRATO_CREADO_TEMPLATE,
  LIQUIDACION_GENERADA_TEMPLATE,
  RECORDATORIO_MENSUAL_TEMPLATE,
} from './templates';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = 'Gesti <noreply@gesti.cl>';
const PORTAL_URL = process.env.NEXT_PUBLIC_URL || 'https://app.gesti.cl';

function fechaHoy(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

interface ContratoEmail {
  id: string;
  nombre_trabajador: string;
  razon_social: string;
  email_trabajador: string;
  email_empleador: string;
  token?: string;
}

/**
 * Envía email de contrato creado al trabajador y empleador.
 * Adjunta el PDF del contrato.
 *
 * @param contrato - Datos del contrato
 * @param pdfUrl - URL pública del PDF en Supabase Storage
 */
export async function enviarEmailContrato(
  contrato: ContratoEmail,
  pdfUrl: string
) {
  const tokenParam = contrato.token ? `?token=${contrato.token}` : '';
  const linkContrato = `${PORTAL_URL}/contratos/${contrato.id}${tokenParam}`;

  const html = renderTemplate(CONTRATO_CREADO_TEMPLATE, {
    trabajador_nombre: contrato.nombre_trabajador,
    empleador_nombre: contrato.razon_social,
    link_contrato: linkContrato,
    fecha_hoy: fechaHoy(),
    url_portal: PORTAL_URL,
  });

  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

  return getResend().emails.send({
    from: FROM_EMAIL,
    to: [contrato.email_trabajador, contrato.email_empleador],
    subject: `Contrato creado: ${contrato.razon_social}`,
    html,
    attachments: [
      {
        filename: `Contrato_${contrato.id}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}

interface LiquidacionEmail {
  id: string;
  nombre_trabajador: string;
  email_trabajador: string;
  email_empleador: string;
  periodo: string;
  bruto: number;
  descuentos: number;
  liquido: number;
}

/**
 * Envía email de liquidación generada al trabajador y empleador.
 * Incluye resumen de montos y links a ambos PDFs.
 *
 * @param liquidacion - Datos de la liquidación
 * @param pdfLiqUrl - URL del PDF de liquidación detallada
 * @param pdfResumenUrl - URL del PDF de resumen de pagos
 */
export async function enviarEmailLiquidacion(
  liquidacion: LiquidacionEmail,
  pdfLiqUrl: string,
  pdfResumenUrl: string
) {
  const html = renderTemplate(LIQUIDACION_GENERADA_TEMPLATE, {
    trabajador_nombre: liquidacion.nombre_trabajador,
    periodo: liquidacion.periodo,
    bruto: liquidacion.bruto,
    descuentos: liquidacion.descuentos,
    liquido: liquidacion.liquido,
    link_pdf_liquidacion: pdfLiqUrl,
    link_pdf_resumen: pdfResumenUrl,
    url_portal: PORTAL_URL,
  });

  const [pdfLiqResponse, pdfResumenResponse] = await Promise.all([
    fetch(pdfLiqUrl),
    fetch(pdfResumenUrl),
  ]);

  const pdfLiqBuffer = Buffer.from(await pdfLiqResponse.arrayBuffer());
  const pdfResumenBuffer = Buffer.from(await pdfResumenResponse.arrayBuffer());

  return getResend().emails.send({
    from: FROM_EMAIL,
    to: [liquidacion.email_trabajador, liquidacion.email_empleador],
    subject: `Liquidación ${liquidacion.periodo}: ${liquidacion.nombre_trabajador}`,
    html,
    attachments: [
      {
        filename: `Liquidacion_${liquidacion.periodo}_${liquidacion.id}.pdf`,
        content: pdfLiqBuffer,
      },
      {
        filename: `Resumen_Pagos_${liquidacion.periodo}_${liquidacion.id}.pdf`,
        content: pdfResumenBuffer,
      },
    ],
  });
}

interface ContratoResumen {
  nombre_trabajador: string;
}

/**
 * Envía recordatorio mensual para generar liquidaciones.
 * Se invoca desde un cron el día 25 de cada mes.
 *
 * @param userId - ID del usuario
 * @param email - Email del usuario
 * @param nombreUsuario - Nombre del usuario
 * @param contratos - Lista de contratos activos
 */
export async function enviarRecordatorioMensual(
  userId: string,
  email: string,
  nombreUsuario: string,
  contratos: ContratoResumen[]
) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const mesActual = meses[new Date().getMonth()];

  const html = renderTemplate(RECORDATORIO_MENSUAL_TEMPLATE, {
    usuario_nombre: nombreUsuario,
    mes: mesActual,
    contratos,
    url_nueva_liquidacion: `${PORTAL_URL}/liquidaciones/nueva`,
    url_portal: PORTAL_URL,
  });

  return getResend().emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `Recordatorio: Genera las liquidaciones de ${mesActual}`,
    html,
  });
}
