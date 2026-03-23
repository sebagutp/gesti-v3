// ============================================================
// POST/GET /api/webhooks/whatsapp — Meta Cloud API Webhook
// Rama D — HU-330
// ============================================================

import { NextRequest } from 'next/server'
import type { WAWebhookPayload } from '@/lib/whatsapp/types'
import { parseIncomingMessages, handleMessage } from '@/lib/whatsapp/handler'

/**
 * GET — Verificación de webhook (Meta Cloud API challenge)
 * Meta envía hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WA_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WA Webhook] Verification successful')
    return new Response(challenge ?? '', { status: 200 })
  }

  console.warn('[WA Webhook] Verification failed — token mismatch')
  return new Response('Forbidden', { status: 403 })
}

/**
 * POST — Recibir mensajes entrantes de WhatsApp
 * Retorna 200 inmediatamente (acknowledgment) y procesa en background
 */
export async function POST(request: NextRequest) {
  try {
    const payload: WAWebhookPayload = await request.json()

    // Validar que es un evento de WhatsApp
    if (payload.object !== 'whatsapp_business_account') {
      return Response.json({ error: 'Not a WhatsApp event' }, { status: 400 })
    }

    const messages = parseIncomingMessages(payload)

    // Procesar mensajes sin bloquear el response (Meta requiere 200 rápido)
    if (messages.length > 0) {
      // Fire-and-forget: procesar cada mensaje
      for (const msg of messages) {
        handleMessage(msg).catch((err) => {
          console.error('[WA Webhook] Error handling message:', msg.messageId, err)
        })
      }
    }

    return Response.json({ status: 'ok' })
  } catch (error) {
    console.error('[WA Webhook] Error parsing payload:', error)
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
