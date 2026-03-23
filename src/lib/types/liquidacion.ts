export interface InputLiquidacion {
  sueldo_base: number
  tipo_sueldo: 'liquido' | 'imponible' | 'bruto'
  afp: string
  es_pensionado: boolean
  dias_trabajados: number
  dias_licencia_medica?: number
  rima?: number
  horas_extra?: number
  anticipo?: number
  otros_bonos?: number
  apv_monto?: number
  apv_regimen?: 'A' | 'B'
  cargas_familiares?: number
  colacion?: number
  movilizacion?: number
  gratificacion?: number
}

export interface ResultadoLiquidacion {
  haberes: {
    sueldo_base: number
    gratificacion: number
    colacion: number
    movilizacion: number
    horas_extra: number
    asignacion_familiar: number
    otros_bonos: number
    total_haberes: number
  }

  descuentos_trabajador: {
    afp: number
    salud: number
    cesantia: number
    iusc: number
    anticipo: number
    apv: number
    total_descuentos: number
  }

  cotizaciones_empleador: {
    sis: number
    accidentes: number
    indemnizacion: number
    cesantia: number
    afp_empleador: number
    expectativa_vida: number
    rentabilidad_protegida: number
    ley_sanna?: number
    total_cotizaciones: number
  }

  totales: {
    bruto: number
    total_imponible: number
    total_descuentos: number
    liquido: number
    total_empleador: number
    costo_total: number
  }

  meta: {
    motor_version: 'v3.1'
    periodo: string
    indicadores_usados: {
      uf: number
      utm: number
      sueldo_minimo_tcp: number
    }
    rli_calculado: number
    errores?: string[]
  }
}

export interface Liquidacion {
  id: string
  contrato_id: string
  user_id: string
  periodo: string
  estado: 'borrador' | 'calculada' | 'enviada' | 'pagada'
  input: InputLiquidacion
  resultado: ResultadoLiquidacion
  pdf_url?: string
  created_at: string
  updated_at: string
}
