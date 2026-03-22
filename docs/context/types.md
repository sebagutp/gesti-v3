# Tipos Compartidos — Gesti V3.1

## Ubicación
`src/lib/types/`

## Propiedad
**Rama B es dueña de estos tipos. Son inmutables durante cada sprint.**
Otros ramales (A, C, D) no pueden modificar sin consenso.

---

## Archivos

### `liquidacion.ts`

```typescript
// Input para calcular liquidación
interface InputLiquidacion {
  sueldo_base: number              // Monto pactado
  tipo_sueldo: 'liquido' | 'imponible' | 'bruto'
  afp: string                      // "Capital", "Cuprum", "Habitat", "PlanVital", "Provida", "Modelo", "Uno"
  es_pensionado: boolean
  dias_trabajados: number          // 1-30
  dias_licencia_medica?: number    // Si < 30, requiere RIMA
  rima?: number                    // Obligatorio si dias_licencia_medica < 30
  horas_extra?: number             // Cantidad de horas al 50%
  anticipo?: number                // Anticipo de sueldo
  otros_bonos?: number             // Bonificaciones no imponibles
  apv_monto?: number               // Ahorro voluntario
  apv_regimen?: 'A' | 'B'          // A no reduce RLI, B sí
  cargas_familiares?: number       // Número de hijos
  colacion?: number                // Bono alimentación
  movilizacion?: number            // Bono transporte
  gratificacion?: number           // Bono anual (si corresponde)
}

// Resultado completo
interface ResultadoLiquidacion {
  // Haberes trabajador
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

  // Descuentos trabajador
  descuentos_trabajador: {
    afp: number
    salud: number
    cesantia: number              // TCP: siempre 0
    iusc: number
    anticipo: number
    apv: number
    total_descuentos: number
  }

  // Cotizaciones empleador
  cotizaciones_empleador: {
    sis: number                   // 1,54%
    accidentes: number            // ISL 0,93%
    indemnizacion: number         // 1,11%
    cesantia: number              // 3% (TCP)
    afp_empleador: number         // Si aplica reforma
    expectativa_vida: number      // 0,9% → 1,0%
    rentabilidad_protegida: number // 0% → 0,9%
    ley_sanna?: number            // Si aplica
    total_cotizaciones: number
  }

  // Totales
  totales: {
    bruto: number                 // Imponible total
    total_imponible: number       // Base para cotizaciones
    total_descuentos: number
    liquido: number               // Lo que recibe trabajador
    total_empleador: number       // Lo que paga empleador
    costo_total: number           // bruto + cotizaciones
  }

  // Metadatos
  meta: {
    motor_version: "v3.1"
    periodo: string               // "2026-03"
    indicadores_usados: {
      uf: number
      utm: number
      sueldo_minimo_tcp: number
    }
    rli_calculado: number         // Para auditoría IUSC
    errores?: string[]
  }
}

// Indicadores previsionales (tabla en Supabase)
interface IndicadoresPrevisionales {
  id: string
  mes: string                     // "2026-03"
  uf: number
  utm: number
  sueldo_minimo_tcp: number

  // AFP tasas
  afp_tasas: {
    [afp: string]: {
      tasa_obligatoria: number    // E.g. 10,45%
      tasa_seguro: number         // E.g. 1,47%
    }
  }

  // Tramos IUSC
  tramos_iusc: Array<{
    rli_hasta: number
    factor: number
    rebaja: number
  }>

  // Topes
  tope_afp: number                // 90 UF
  tope_cesantia: number           // 135,2 UF

  // Tasas empleador
  tasas: {
    sis: number                   // 1,54%
    isl: number                   // 0,93%
    indemnizacion: number         // 1,11%
    cesantia_tcp: number          // 3%
  }

  // Reforma previsional
  reforma: {
    cap_individual_afp: number    // 0,1% (2026)
    expectativa_vida: number      // 0,9% o 1,0% según fecha
    rentabilidad_protegida: number // 0% o 0,9% según fecha
  }

  // IUSC exención
  rli_exento_hasta: number        // $943.501 en 2026

  created_at: string
  updated_at: string
}
```

### `contrato.ts`

```typescript
type TipoContrato = 'puertas_afuera' | 'puertas_adentro'
type TipoJornada = 'full' | 'part'
type TipoDocumento = 'rut' | 'pasaporte'
type EstadoContrato = 'borrador' | 'generado' | 'enviado' | 'firmado' | 'activo' | 'terminado'

interface Contrato {
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
  fecha_inicio: string            // ISO date
  fecha_termino?: string

  // Beneficios
  gratificacion: boolean
  colacion: number                // CLP
  movilizacion: number            // CLP
  otros_bonos?: number

  // Estado
  estado: EstadoContrato
  pdf_url?: string
  token: string                   // Para compartir sin login
  vigente: boolean

  // Auditoría
  created_at: string
  updated_at: string
}

interface ContratoInput extends Omit<Contrato, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'estado' | 'pdf_url' | 'token'> {}
```

### `common.ts`

```typescript
type PlanType = 'Free' | 'Pro_Mensual' | 'Pro_Anual'
type Feature = 'simular_contrato' | 'simular_liquidacion' | 'contrato_valido' | 'liquidaciones' | 'pdf_generacion' | 'soporte'

interface UserPlan {
  plan_type: PlanType
  plan_status: 'active' | 'expired' | 'cancelled'
  start_date: string
  end_date: string
  features: Feature[]
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    per_page: number
    pages: number
  }
}
```

### `forms.ts`

```typescript
type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'multiselect' | 'radio' | 'textarea' | 'rut' | 'checkbox'

interface FormFieldOption {
  value: string
  label: string
}

interface FormStep {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  options?: FormFieldOption[]
  validation?: {
    required?: boolean
    min?: number
    max?: number
    pattern?: string
  }
  showIf?: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'
    value: any
  }
  helperText?: string
}

// IMPORTANTE: FormStep[] DEBE ser 100% serializable (JSON.stringify/parse)
// Para reutilización en WhatsApp bot runner
interface Form {
  id: string
  name: string
  steps: FormStep[]
  version: string
}
```

---

## Notas Importantes

1. **Rama B es propietaria:** Cambios solo con consenso de equipo
2. **Serializable:** FormStep[] sin closures ni funciones complejas
3. **Auditoría:** motor_version y indicadores_usados siempre presentes
4. **Inmutables en sprint:** No cambiar después de definir
5. **Tipos en tiempo de compilación:** Validados con TypeScript strict
