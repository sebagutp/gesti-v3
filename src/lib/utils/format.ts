// ============================================================
// Helpers de formato — Gesti V3.1 (Rama B)
// ============================================================

/**
 * Formatea un número como pesos chilenos (CLP).
 * Ej: 605767 → "$605.767"
 */
export function formatCLP(monto: number): string {
  const rounded = Math.round(monto)
  return '$' + rounded.toLocaleString('es-CL')
}

/**
 * Formatea un número como porcentaje.
 * Ej: 0.1045 → "10,45%", 0.07 → "7,00%"
 * @param decimales - cantidad de decimales (default 2)
 */
export function formatPercent(valor: number, decimales: number = 2): string {
  return (valor * 100).toFixed(decimales).replace('.', ',') + '%'
}
