/**
 * Formatea un número como pesos chilenos: $1.234.567
 */
export function formatCLP(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-CL')
}

/**
 * Formatea un número como porcentaje: 12,5%
 */
export function formatPercent(value: number): string {
  return value.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%'
}

/**
 * Formatea fecha ISO a formato chileno: 01/03/2026
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00')
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Formatea periodo YYYY-MM a nombre legible: "Marzo 2026"
 */
export function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-')
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${meses[parseInt(month, 10) - 1]} ${year}`
}
