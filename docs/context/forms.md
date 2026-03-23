# Sistema de Formularios — Gesti V3.1

## Componente: MultiStepForm

Ubicación: `src/components/forms/MultiStepForm.tsx`

Una pregunta por pantalla estilo Typeform. Transiciones suaves con Framer Motion.

### Características
- **1 pregunta/pantalla** — UX minimalista
- **Transiciones verticales** — Framer Motion fade + slide
- **Validación por paso** — Zod schema
- **Barra de progreso** — Visual feedback
- **Bifurcaciones** — Mostrar/ocultar pasos según respuestas previas
- **Persistencia** — localStorage automática
- **Serializable** — JSON.stringify/parse para reutilizar en WhatsApp bot

### Props

```typescript
interface MultiStepFormProps {
  steps: FormStep[]                    // Array de pasos
  onComplete: (answers: Record<string, any>) => void
  onSave?: (answers: Record<string, any>) => void
  title?: string
  description?: string
  autoSave?: boolean                   // Guardar a localStorage cada paso
  showProgress?: boolean               // Mostrar barra % de avance
}
```

### FormStep Interface

```typescript
interface FormStep {
  id: string                           // Identificador único
  type: FormFieldType                  // text|email|number|date|select|multiselect|radio|textarea|rut|checkbox
  label: string                        // Pregunta visible
  placeholder?: string
  options?: FormFieldOption[]          // Para select/radio/multiselect
  validation?: ZodSchema | {           // Validación (Zod o config simple)
    required?: boolean
    min?: number
    max?: number
    pattern?: string
  }
  showIf?: {                           // Bifurcación condicional
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'
    value: any
  }
  helperText?: string
}
```

---

## Restricción Crítica: Serializable

**El array `FormStep[]` DEBE ser 100% serializable.**

❌ NO permitido:
```typescript
showIf: (answers) => answers.tipo_contrato === 'puertas_afuera'  // Función closures
validation: z.object({...})  // Zod directo
onComplete: () => {}  // Callbacks
```

✅ Permitido:
```typescript
showIf: {
  field: 'tipo_contrato',
  operator: 'equals',
  value: 'puertas_afuera'
}
validation: {
  required: true,
  min: 10
}
```

**Razón:** Se serializan en la DB y se reutilizan en el WhatsApp bot runner (Sprint 3).

---

## Formularios Implementados

### 1. Formulario Contrato

**Ubicación:** `src/components/forms/ContractForm/steps.ts` + `MultiStepForm.tsx`

**4 Secciones:**
1. **Empleador** (6-8 pasos)
   - Razón social
   - RUT empresa
   - Email
   - Domicilio

2. **Trabajador** (6-8 pasos)
   - Nombre completo
   - Tipo documento (RUT/Pasaporte)
   - Número documento
   - Email
   - Domicilio
   - Nacionalidad

3. **Jornada** (4-5 pasos)
   - Tipo contrato (puertas_afuera | puertas_adentro)
   - Tipo jornada (full | part)
   - Sueldo base
   - Tipo sueldo (líquido | imponible)
   - AFP (dropdown con 7 opciones)

4. **Condiciones** (3-4 pasos)
   - Fecha inicio
   - Gratificación (boolean)
   - Colación (number)
   - Movilización (number)

**Total:** ~25-30 pasos

**Output:** `ContratoInput` (listo para POST `/api/contratos`)

---

### 2. Formulario Liquidación

**Ubicación:** `src/components/forms/LiquidacionForm.tsx`

**3 Secciones:**
1. **Datos Mensuales** (4-5 pasos)
   - Período (date picker YYYY-MM)
   - Días trabajados (1-30)
   - Horas extra (optional)
   - Anticipo (optional)

2. **Licencia Médica** (2-3 pasos, condicionales)
   - Si aplica: Días licencia
   - Si < 30 días: RIMA (obligatorio)

3. **Bonificaciones** (2-3 pasos)
   - Otros bonos (optional)
   - Comentarios (optional)

**Total:** ~10-15 pasos (variable según bifurcaciones)

**Output:** Datos para POST `/api/liquidaciones` + llamar motor cálculo

---

### 3. Formulario Permisos

**Ubicación:** `src/components/forms/PermisoForm.tsx`

**3 Secciones:**
1. **Tipo de Permiso** (1 paso)
   - Vacaciones
   - Licencia por enfermedad
   - Licencia parental
   - Permiso sin pago

2. **Fechas** (2 pasos)
   - Fecha inicio
   - Fecha término

3. **Observaciones** (1 paso, opcional)
   - Notas adicionales

**Total:** ~5-6 pasos

**Output:** Datos para POST `/api/permisos`

---

## Integración con Page Router

### Página de Contrato Nuevo

```typescript
// src/app/(dashboard)/contratos/nuevo/page.tsx
import { FormContrato } from '@/components/forms/FormContrato'

export default function NuevoContratoPage() {
  const handleComplete = async (contractoData) => {
    const response = await fetch('/api/contratos', {
      method: 'POST',
      body: JSON.stringify(contractoData),
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.ok) {
      const { id } = await response.json()
      router.push(`/contratos/${id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <FormContrato onComplete={handleComplete} />
    </div>
  )
}
```

---

## Validación con Zod

Aunque `FormStep[]` es serializable, la validación en runtime usa Zod:

```typescript
// src/lib/forms/schemas.ts
const StepValidation = {
  'empleador_rut': z.string().regex(/^\d{8}[-\d]$/),
  'trabajador_rut': z.string().regex(/^\d{8}[-\d]$/),
  'trabajador_email': z.string().email(),
  'sueldo_base': z.number().min(539000),  // Mínimo TCP 2026
}
```

---

## Persistencia LocalStorage

MultiStepForm guarda automáticamente cada respuesta:
```typescript
localStorage.setItem(`form_${formId}_draft`, JSON.stringify(answers))
```

Permite **retomar donde se dejó** en caso de recarga página.

---

## WhatsApp Bot Integration (Sprint 3)

Los formularios se reutilizan en el bot de WhatsApp vía:

```typescript
// Serializar
const formJson = JSON.stringify(form.steps)
// Enviar a Edge Function
// Bot runner deserializa y usa las mismas reglas de validación
```

Esto **no es soportado por NextJS nativo**, se usa Supabase Edge Function separada.

---

## Estilos y Componentes

Usan **shadcn/ui**:
- Input, Select, RadioGroup (para form fields)
- Button (submit, continue)
- Card (contenedor)
- Badge (progress indicator)

**Colores:** Verde (#6fc8a0) para botones, Teal (#135e5f) para headers.
