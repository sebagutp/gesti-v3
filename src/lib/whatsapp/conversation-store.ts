// ============================================================
// Conversation Store — Supabase persistence — HU-333
// Persiste estado conversacional entre mensajes WhatsApp
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'

export interface ConversationState {
  mode: 'menu' | 'simulacion' | 'consulta'
  currentStep: number
  data: Record<string, unknown>
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
}

const TIMEOUT_MINUTES = 30

/** Obtener conversación activa (null si no existe o expirada) */
export async function getConversation(phone: string): Promise<ConversationState | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('wa_conversations')
    .select('mode, current_step, data, chat_history, updated_at')
    .eq('phone', phone)
    .single()

  if (error || !data) return null

  // Check timeout
  const updatedAt = new Date(data.updated_at).getTime()
  if (Date.now() - updatedAt > TIMEOUT_MINUTES * 60 * 1000) {
    await deleteConversation(phone)
    return null
  }

  return {
    mode: data.mode as ConversationState['mode'],
    currentStep: typeof data.current_step === 'string' ? Number(data.current_step) || 0 : data.current_step,
    data: (data.data as Record<string, unknown>) ?? {},
    chatHistory: (data.chat_history as ConversationState['chatHistory']) ?? [],
  }
}

/** Crear o actualizar conversación */
export async function upsertConversation(phone: string, state: ConversationState): Promise<void> {
  const supabase = createAdminClient()

  // Keep chat history bounded
  const chatHistory = state.chatHistory.slice(-20)

  const { error } = await supabase
    .from('wa_conversations')
    .upsert(
      {
        phone,
        mode: state.mode,
        current_step: String(state.currentStep),
        data: state.data,
        chat_history: chatHistory,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone' }
    )

  if (error) {
    console.error('[WA Store] Error upserting conversation:', error)
  }
}

/** Eliminar conversación (reset) */
export async function deleteConversation(phone: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('wa_conversations')
    .delete()
    .eq('phone', phone)

  if (error) {
    console.error('[WA Store] Error deleting conversation:', error)
  }
}
