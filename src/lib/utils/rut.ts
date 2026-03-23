// ============================================================
// Utilidades RUT chileno — Gesti V3.1 (Rama B)
// ============================================================

/**
 * Calcula el dígito verificador de un RUT chileno.
 */
function calcularDV(cuerpo: number): string {
  let suma = 0
  let multiplo = 2
  let str = String(cuerpo)

  for (let i = str.length - 1; i >= 0; i--) {
    suma += parseInt(str[i], 10) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }

  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

/**
 * Valida un RUT chileno (con o sin formato).
 * Acepta: "12.345.678-5", "12345678-5", "123456785"
 * Retorna true si el dígito verificador es correcto.
 */
export function validarRUT(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false

  const limpio = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (limpio.length < 2) return false

  const cuerpo = parseInt(limpio.slice(0, -1), 10)
  const dv = limpio.slice(-1)

  if (isNaN(cuerpo) || cuerpo < 1000000) return false

  return calcularDV(cuerpo) === dv
}

/**
 * Formatea un RUT a formato estándar: "12.345.678-5"
 * Asume que el RUT ya fue validado.
 */
export function formatearRUT(rut: string): string {
  const limpio = rut.replace(/[.\-\s]/g, '').toUpperCase()
  const dv = limpio.slice(-1)
  const cuerpo = limpio.slice(0, -1)

  const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formateado}-${dv}`
}
