// ============================================================
// WhatsApp Cloud API Client — Gesti V3.1 (Rama D)
// ============================================================

import type { WASendTextPayload, WASendInteractivePayload } from './types'

const WA_API_URL = 'https://graph.facebook.com/v21.0'

function getConfig() {
  const token = process.env.WA_ACCESS_TOKEN
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    throw new Error('Missing WA_ACCESS_TOKEN or WA_PHONE_NUMBER_ID env vars')
  }
  return { token, phoneNumberId }
}

/** Enviar mensaje de texto simple */
export async function sendTextMessage(to: string, body: string): Promise<void> {
  const { token, phoneNumberId } = getConfig()

  const payload: WASendTextPayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  }

  const res = await fetch(`${WA_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[WA] Error sending text message:', err)
  }
}

/** Enviar mensaje con botones interactivos (máximo 3 botones) */
export async function sendButtonMessage(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  const { token, phoneNumberId } = getConfig()

  const payload: WASendInteractivePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply' as const,
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  }

  const res = await fetch(`${WA_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[WA] Error sending button message:', err)
  }
}

/** Enviar mensaje con lista interactiva (máximo 10 opciones) */
export async function sendListMessage(
  to: string,
  bodyText: string,
  buttonLabel: string,
  sectionTitle: string,
  rows: Array<{ id: string; title: string; description?: string }>
): Promise<void> {
  const { token, phoneNumberId } = getConfig()

  const payload: WASendInteractivePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel,
        sections: [{ title: sectionTitle, rows: rows.slice(0, 10) }],
      },
    },
  }

  const res = await fetch(`${WA_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[WA] Error sending list message:', err)
  }
}
