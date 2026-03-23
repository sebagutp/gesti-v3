/**
 * Upload PDF a Supabase Storage — Gesti V3.1
 *
 * Sube archivos al bucket `documentos` (público) y retorna la URL pública.
 * Usa el server client de Supabase (autenticado vía cookies de sesión).
 */

import { createServerClient } from '@/lib/supabase/server';

const BUCKET = 'documentos';

/**
 * Sube un Buffer PDF a Supabase Storage y retorna la URL pública.
 *
 * @param buffer - Buffer con el contenido del PDF
 * @param fileName - Ruta dentro del bucket (ej: "contratos/ABC-123.pdf")
 * @returns URL pública del archivo subido
 * @throws Error si falla el upload o no se puede obtener la URL
 */
export async function uploadToSupabase(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const supabase = await createServerClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Error subiendo PDF a Storage: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  if (!urlData?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública del PDF');
  }

  return urlData.publicUrl;
}
