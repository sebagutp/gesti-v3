// ============================================================
// Validaciones de Input — Motor v3.1 (Rama B)
// ============================================================

import type { InputLiquidacion, IndicadoresPrevisionales } from '../types/liquidacion'

export function validarInput(
  input: InputLiquidacion,
  indicadores: IndicadoresPrevisionales,
): string[] {
  const errores: string[] = []

  if (input.sueldo_base <= 0) {
    errores.push('sueldo_base debe ser mayor a 0')
  }

  if (input.dias_trabajados < 1 || input.dias_trabajados > 30) {
    errores.push('dias_trabajados debe estar entre 1 y 30')
  }

  if (!indicadores.afp_tasas[input.afp]) {
    errores.push(`AFP "${input.afp}" no encontrada en indicadores`)
  }

  const diasLicencia = input.dias_licencia_medica ?? 0
  if (diasLicencia > 0 && diasLicencia < 30 && !input.rima) {
    errores.push('RIMA es obligatorio cuando hay licencia médica parcial')
  }

  if (diasLicencia > 0 && input.dias_trabajados + diasLicencia > 30) {
    errores.push('dias_trabajados + dias_licencia_medica no puede superar 30')
  }

  if (input.apv_monto && input.apv_monto > 0 && !input.apv_regimen) {
    errores.push('apv_regimen (A o B) es obligatorio si apv_monto > 0')
  }

  return errores
}
