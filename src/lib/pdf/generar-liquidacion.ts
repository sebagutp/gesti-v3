/**
 * Orquestador PDF Liquidación y Resumen Pagos — Gesti V3.1
 *
 * Pipeline: leer template → renderizar variables → generar PDF → subir a Storage
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { renderTemplate } from './render-template';
import { generatePDF } from './generate-pdf';
import { uploadToSupabase } from './upload-to-supabase';

/**
 * Genera el PDF de una liquidación de sueldo y lo sube a Supabase Storage.
 *
 * @param liquidacionId - ID de la liquidación
 * @param variables - Variables para la plantilla (ver docs/context/pdf.md)
 * @returns URL pública del PDF generado
 */
export async function generarLiquidacionPDF(
  liquidacionId: string,
  variables: Record<string, unknown>
): Promise<string> {
  const templatePath = join(process.cwd(), 'src/templates/liquidaciones/liquidacion_sueldo.html');
  const templateHtml = await readFile(templatePath, 'utf-8');

  const html = renderTemplate(templateHtml, variables);
  const pdfBuffer = await generatePDF(html);
  const fileName = `liquidaciones/${liquidacionId}.pdf`;
  const url = await uploadToSupabase(pdfBuffer, fileName);

  return url;
}

/**
 * Genera el PDF de resumen de pagos del empleador y lo sube a Supabase Storage.
 *
 * @param liquidacionId - ID de la liquidación asociada
 * @param variables - Variables para la plantilla (incluye cotizaciones reforma)
 * @returns URL pública del PDF generado
 */
export async function generarResumenPagosPDF(
  liquidacionId: string,
  variables: Record<string, unknown>
): Promise<string> {
  const templatePath = join(process.cwd(), 'src/templates/liquidaciones/resumen_pagos.html');
  const templateHtml = await readFile(templatePath, 'utf-8');

  const html = renderTemplate(templateHtml, variables);
  const pdfBuffer = await generatePDF(html);
  const fileName = `liquidaciones/resumen-${liquidacionId}.pdf`;
  const url = await uploadToSupabase(pdfBuffer, fileName);

  return url;
}
