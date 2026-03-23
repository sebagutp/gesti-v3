// ============================================================
// Tipos WhatsApp — Gesti V3.1 (Rama D)
// ============================================================

/** Mensaje entrante de Meta Cloud API */
export interface WAWebhookPayload {
  object: string
  entry: WAEntry[]
}

export interface WAEntry {
  id: string
  changes: WAChange[]
}

export interface WAChange {
  value: WAChangeValue
  field: string
}

export interface WAChangeValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: WAContact[]
  messages?: WAMessage[]
  statuses?: WAStatus[]
}

export interface WAContact {
  profile: { name: string }
  wa_id: string
}

export interface WAMessage {
  from: string
  id: string
  timestamp: string
  type: 'text' | 'interactive' | 'button' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'sticker' | 'reaction' | 'unsupported'
  text?: { body: string }
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
}

export interface WAStatus {
  id: string
  status: string
  timestamp: string
  recipient_id: string
}

/** Payload para enviar mensaje de texto */
export interface WASendTextPayload {
  messaging_product: 'whatsapp'
  to: string
  type: 'text'
  text: { body: string }
}

/** Payload para enviar mensaje con botones interactivos */
export interface WASendInteractivePayload {
  messaging_product: 'whatsapp'
  to: string
  type: 'interactive'
  interactive: {
    type: 'button' | 'list'
    body: { text: string }
    action: {
      buttons?: Array<{
        type: 'reply'
        reply: { id: string; title: string }
      }>
      button?: string
      sections?: Array<{
        title: string
        rows: Array<{ id: string; title: string; description?: string }>
      }>
    }
  }
}

/** Estado de conversación persistido */
export interface WAConversation {
  id: string
  phone: string
  current_step: string
  data: Record<string, unknown>
  mode: 'menu' | 'simulacion' | 'consulta'
  updated_at: string
  created_at: string
}

/** Parsed message simplificado */
export interface ParsedMessage {
  from: string
  messageId: string
  type: 'text' | 'interactive' | 'unsupported'
  text: string
  interactiveId?: string
  contactName?: string
  phoneNumberId: string
}
