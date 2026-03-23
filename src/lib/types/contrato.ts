// ============================================================
// Tipos Contrato — Gesti V3.1 (Rama B, inmutables en sprint)
// ============================================================

export type TipoContrato = 'puertas_afuera' | 'puertas_adentro'
export type TipoJornada = 'full' | 'part'
export type TipoDocumento = 'rut' | 'pasaporte'
export type EstadoContrato = 'borrador' | 'generado' | 'enviado' | 'firmado' | 'activo' | 'terminado'

export interface Contrato {
  id: string
  user_id: string

  // Datos empleador
  razon_social: string
  rut_empresa: string
  nombre_empleador: string
  email_empleador: string
  telefono_empleador?: string
  domicilio_empleador: string

  // Datos trabajador
  nombre_trabajador: string
  apellidos_trabajador: string
  tipo_documento: TipoDocumento
  numero_documento: string
  email_trabajador: string
  domicilio_trabajador: string
  nacionalidad: string

  // Contrato
  tipo_contrato: TipoContrato
  tipo_jornada: TipoJornada
  sueldo_base: number
  tipo_sueldo: 'liquido' | 'imponible'
  afp: string
  fecha_inicio: string
  fecha_termino?: string

  // Beneficios
  gratificacion: boolean
  colacion: number
  movilizacion: number
  otros_bonos?: number

  // Estado
  estado: EstadoContrato
  pdf_url?: string
  token: string
  vigente: boolean

  // Auditoría
  created_at: string
  updated_at: string
}

export interface ContratoInput extends Omit<Contrato, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'estado' | 'pdf_url' | 'token'> {}
