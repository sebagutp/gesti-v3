// ============================================================
// WhatsApp Message Handler — Gesti V3.1 (Rama D) — HU-330/331/332/333
// Parsea mensajes entrantes y despacha al flujo correspondiente
// ============================================================

import type { WAWebhookPayload, ParsedMessage } from './types'
import { sendTextMessage, sendButtonMessage } from './client'
import { sendStepPrompt, processStepResponse } from './simulation-flow'
import { generateLegalResponse } from './ai-chatbot'
import {
  getConversation,
  upsertConversation,
  deleteConversation,
  type ConversationState,
} from './conversation-store'

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
  const { from, text, interactiveId } = parsed

  if (parsed.type === 'unsupported') {
    await sendTextMessage(from, 'Solo puedo procesar mensajes de texto. Escribe *hola* para comenzar.')
    return
  }

  const lower = text.toLowerCase()

  // Check for reset commands
  if (['hola', 'menu', 'menú', 'inicio', 'reiniciar', 'salir'].includes(lower)) {
    await deleteConversation(from)
    await sendMainMenu(from)
    return
  }

  // Fetch persisted conversation state (returns null if expired or not found)
  const conv = await getConversation(from)

  // No active conversation — show menu or handle menu selection
  if (!conv) {
    if (interactiveId === 'menu_simular' || lower === 'simular' || lower === '1') {
      const state: ConversationState = { mode: 'simulacion', currentStep: 0, data: {}, chatHistory: [] }
      await upsertConversation(from, state)
      await sendStepPrompt(from, 0, {})
      return
    }
    if (interactiveId === 'menu_consulta' || lower === 'consulta' || lower === '2') {
      const state: ConversationState = { mode: 'consulta', currentStep: 0, data: {}, chatHistory: [] }
      await upsertConversation(from, state)
      await sendTextMessage(from, '🤖 *Modo consulta laboral*\n\nPregúntame sobre legislación laboral de Trabajadores de Casa Particular en Chile.\n\nEscribe *menu* para volver al menú.')
      return
    }
    await sendMainMenu(from)
    return
  }

  // Active simulation flow
  if (conv.mode === 'simulacion') {
    const result = await processStepResponse(from, conv.currentStep, text, interactiveId, conv.data)
    if (result.completed) {
      await deleteConversation(from)
    } else {
      await upsertConversation(from, {
        ...conv,
        currentStep: result.nextStep,
        data: result.data,
      })
    }
    return
  }

  // Active consultation flow — Claude AI for TCP labor law
  if (conv.mode === 'consulta') {
    const response = await generateLegalResponse(text, conv.chatHistory)
    const updatedHistory = [
      ...conv.chatHistory,
      { role: 'user' as const, content: text },
      { role: 'assistant' as const, content: response },
    ]
    await upsertConversation(from, {
      ...conv,
      chatHistory: updatedHistory,
    })
    await sendTextMessage(from, response)
    return
  }
}

async function sendMainMenu(to: string): Promise<void> {
  await sendButtonMessage(
    to,
    '👋 *¡Hola! Soy el asistente de Gesti*\n\n¿Qué te gustaría hacer?\n\n1️⃣ *Simular liquidación* — Calcula sueldo líquido, descuentos y costo empleador\n2️⃣ *Consulta laboral* — Pregunta sobre legislación TCP chilena',
    [
      { id: 'menu_simular', title: 'Simular liquidación' },
      { id: 'menu_consulta', title: 'Consulta laboral' },
    ]
  )
}
