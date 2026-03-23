/**
 * Orquestador PDF Contrato TCP — Gesti V3.1
 *
 * Pipeline: leer template → renderizar variables → generar PDF → subir a Storage
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { renderTemplate } from './render-template';
import { generatePDF } from './generate-pdf';
import { uploadToSupabase } from './upload-to-supabase';

/**
 * Genera el PDF de un contrato TCP y lo sube a Supabase Storage.
 *
 * @param contratoId - ID del contrato (para nombrar el archivo)
 * @param variables - Variables para la plantilla (ver docs/context/pdf.md)
 * @returns URL pública del PDF generado
 */
export async function generarContratoPDF(
  contratoId: string,
  variables: Record<string, unknown>
): Promise<string> {
  const templatePath = join(process.cwd(), 'src/templates/contratos/contrato_tcp.html');
  const templateHtml = await readFile(templatePath, 'utf-8');

  const html = renderTemplate(templateHtml, variables);
  const pdfBuffer = await generatePDF(html);
  const fileName = `contratos/${contratoId}.pdf`;
  const url = await uploadToSupabase(pdfBuffer, fileName);

  return url;
}
