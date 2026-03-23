// ============================================================
// Chatbot IA Legislación Laboral TCP — Gesti V3.1 (Rama D) — HU-332
// Claude API para consultas sobre legislación laboral TCP chilena
// ============================================================

import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Eres un asistente legal especializado en legislación laboral chilena para Trabajadores de Casa Particular (TCP), también conocidos como "trabajadoras de casa particular", "empleadas domésticas" o "nanas".

Tu conocimiento incluye:
- Código del Trabajo chileno, especialmente los artículos 146 al 152 (TCP)
- Ley 20.786 (2014): Jornada laboral, descanso semanal, registro de asistencia para TCP
- Ley 21.327: Modernización Dirección del Trabajo
- Ley 21.735: Reforma Previsional (cotizaciones empleador, gradualidad)
- Artículo 42 N°1 DL 824: Impuesto Único de Segunda Categoría (IUSC sobre RLI)
- Cotizaciones previsionales: AFP, Salud, Cesantía (0% trabajador / 3% empleador TCP), SIS, ISL
- Contratos de trabajo TCP: puertas afuera y puertas adentro
- Jornadas: completa (45 hrs/sem), parcial, puertas adentro (máx 12 hrs diarias con descanso)
- Permisos: feriado legal (15 días hábiles tras 1 año), postnatal, licencias médicas
- Indemnización por años de servicio (TCP tiene régimen especial)
- Sueldo mínimo TCP: $539.000 (marzo 2026, igual al general)
- Gratificación legal: artículo 50 del Código del Trabajo
- Asignación familiar: tramos según cargas

REGLAS:
1. Solo responde consultas sobre legislación laboral chilena relacionada con TCP
2. Si la pregunta no es sobre TCP o legislación laboral chilena, indica amablemente que solo puedes ayudar con temas laborales de TCP
3. Responde en español chileno, de forma clara y accesible
4. Cita artículos y leyes cuando sea relevante
5. Si no estás seguro de un dato específico, indícalo claramente
6. Mantén respuestas concisas (máximo 500 palabras), aptas para leer en WhatsApp
7. No des asesoría legal vinculante — sugiere consultar un abogado para casos complejos
8. Usa formato amigable para WhatsApp (*negritas*, listas con guiones)`

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY env var')
    client = new Anthropic({ apiKey })
  }
  return client
}

/** Generar respuesta IA para consulta laboral TCP */
export async function generateLegalResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  const anthropic = getClient()

  // Build messages with conversation history (max last 10 turns)
  const recentHistory = conversationHistory.slice(-10)
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...recentHistory,
    { role: 'user', content: userMessage },
  ]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.text ?? 'No pude generar una respuesta. Intenta reformular tu pregunta.'
  } catch (error) {
    console.error('[AI Chatbot] Error calling Claude API:', error)
    return '⚠️ Hubo un problema al procesar tu consulta. Intenta nuevamente en un momento.'
  }
}
