/**
 * POST /api/generar-pdf
 *
 * Recibe HTML renderizado + nombre de archivo, genera PDF y sube a Supabase Storage.
 *
 * Request body: { html: string, fileName: string }
 * Response: { url: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePDF } from '@/lib/pdf/generate-pdf';
import { uploadToSupabase } from '@/lib/pdf/upload-to-supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html, fileName } = body;

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'Campo "html" es requerido y debe ser string' },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        { error: 'Campo "fileName" es requerido y debe ser string' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generatePDF(html);
    const url = await uploadToSupabase(pdfBuffer, fileName);

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generando PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
