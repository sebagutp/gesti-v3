// ============================================================
// WhatsApp Message Handler — Gesti V3.1 (Rama D) — HU-330
// Parsea mensajes entrantes y despacha al flujo correspondiente
// ============================================================

import type { WAWebhookPayload, ParsedMessage } from './types'
import { sendTextMessage } from './client'

/** Parsear payload de Meta Cloud API y extraer mensajes */
export function parseIncomingMessages(payload: WAWebhookPayload): ParsedMessage[] {
  const messages: ParsedMessage[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue
      const value = change.value
      const phoneNumberId = value.metadata?.phone_number_id ?? ''

      for (const msg of value.messages ?? []) {
        const contact = value.contacts?.find((c) => c.wa_id === msg.from)

        let text = ''
        let interactiveId: string | undefined

        if (msg.type === 'text' && msg.text?.body) {
          text = msg.text.body.trim()
        } else if (msg.type === 'interactive') {
          if (msg.interactive?.type === 'button_reply' && msg.interactive.button_reply) {
            text = msg.interactive.button_reply.title
            interactiveId = msg.interactive.button_reply.id
          } else if (msg.interactive?.type === 'list_reply' && msg.interactive.list_reply) {
            text = msg.interactive.list_reply.title
            interactiveId = msg.interactive.list_reply.id
          }
        }

        messages.push({
          from: msg.from,
          messageId: msg.id,
          type: msg.type === 'text' ? 'text' : msg.type === 'interactive' ? 'interactive' : 'unsupported',
          text,
          interactiveId,
          contactName: contact?.profile?.name,
          phoneNumberId,
        })
      }
    }
  }

  return messages
}

/** Manejar un mensaje individual (punto de entrada principal) */
export async function handleMessage(parsed: ParsedMessage): Promise<void> {
  if (parsed.type === 'unsupported') {
    await sendTextMessage(
      parsed.from,
      '⚠️ Lo siento, solo puedo procesar mensajes de texto. Escribe *hola* para comenzar.'
    )
    return
  }

  // Placeholder — HU-331/332/333 implementarán los flujos completos
  await sendTextMessage(
    parsed.from,
    '👋 ¡Hola! Soy el asistente de *Gesti*. Pronto podré ayudarte con simulaciones de liquidación y consultas laborales. Estamos trabajando en ello.'
  )
}
