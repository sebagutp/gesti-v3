# Componentes UI — Gesti V3.1

## Paleta de Colores
```
Verde:    #6fc8a0  (primary actions, buttons)
Teal:     #135e5f  (sidebar, headers, backgrounds)
Amarillo: #ffde59  (highlights, warnings, CTAs)
Dark:     #2f2e40  (texto principal)
BG:       #f4f4f9  (fondos, surfaces)
White:    #ffffff  (backgrounds claros)
Gray:     #999999  (texto secundario)
Error:    #ff4444  (validaciones)
Success:  #44ff44  (éxito)
```

### Uso
- **Botones primarios:** Verde
- **Sidebar/Headers:** Teal
- **Advertencias/Alerts:** Amarillo
- **Fondos neutros:** BG gris claro
- **Texto:** Dark para principal, Gray para secundario

---

## Tipografía
**Google Fonts: Poppins**
- weight 300 — Light (labels secundarios)
- weight 400 — Regular (cuerpo, parrafos)
- weight 500 — Medium (labels, pequeños títulos)
- weight 600 — Semi-bold (títulos, secciones)
- weight 700 — Bold (títulos principales)

```css
font-family: 'Poppins', sans-serif;
```

---

## Componentes Base (shadcn/ui)

Instalados y configurados:
- **Button** — Variants: default, secondary, outline, ghost, destructive
- **Card** — Container con shadow y bordes redondeados
- **Input** — Text, email, number, date inputs
- **Select** — Dropdown nativo
- **Dialog** — Modal overlay
- **Sheet** — Slide-out panel (mobile friendly)
- **Table** — Tabla con sorting (opcional)
- **Badge** — Etiquetas pequeñas (status, tags)
- **Tabs** — Tab navigation
- **Toast** — Notificaciones tipo toast
- **AlertDialog** — Confirmación destructiva

---

## Componentes Custom

### Layout

#### `Sidebar.tsx`
Navegación lateral persistente.

**Desktop:** 150px ancho, fijo a la izquierda
**Mobile:** Hidden by default, hamburger toggle en Header

**Props:**
```typescript
interface SidebarProps {
  items: { icon: ReactNode; label: string; href: string }[]
  activeItem?: string
  onNavigate?: (href: string) => void
}
```

**Contenido típico:**
- Logo (60×60)
- Nav items (Contratos, Liquidaciones, Permisos, Perfil, Billing)
- Divider
- Help / Logout

**Estilos:**
- Background: Teal #135e5f
- Texto: White
- Hover: Amarillo highlight

---

#### `Header.tsx`
Barra superior con logo, usuario, plan badge, notificaciones.

**Props:**
```typescript
interface HeaderProps {
  userName?: string
  planType?: PlanType
  planStatus?: 'active' | 'expired'
  notificationCount?: number
  onLogout?: () => void
}
```

**Contenido:**
- Logo (compact 40×40)
- User nombre + dropdown (Perfil, Logout)
- Plan badge (Free|Pro|Pro Anual)
- Notificación bell icon
- Mobile: Hamburger para Sidebar

**Responsive:**
- Desktop: Full width Header
- Mobile: Compact, Sidebar hamburger

---

### Dashboard Components

#### `ContractCard.tsx`
Card individual para mostrar contrato.

**Props:**
```typescript
interface ContractCardProps {
  contrato: Contrato
  onEdit?: () => void
  onGeneratePDF?: () => void
  onDelete?: () => void
}
```

**Layout:**
```
┌─────────────────────────┐
│ Nombre Trabajador   [STATUS BADGE]
│ Empleador: Razon Social
│ Sueldo: $500.000
│ Desde: 01/03/2026
│
│ [Editar] [Generar PDF] [...]
└─────────────────────────┘
```

**Status Badges:**
- `borrador` — Gray
- `generado` — Yellow
- `enviado` — Green
- `activo` — Green bold
- `terminado` — Dark

---

#### `LiquidacionTable.tsx`
Tabla de liquidaciones con paginación.

**Props:**
```typescript
interface LiquidacionTableProps {
  liquidaciones: Liquidacion[]
  onEdit?: (id: string) => void
  onDownloadPDF?: (id: string) => void
  onSend?: (id: string) => void
  isLoading?: boolean
}
```

**Columnas:**
| Periodo | Bruto | Descuentos | Líquido | Estado | Acciones |
|---------|-------|-----------|--------|--------|----------|

**Funcionalidades:**
- Ordenable (click header)
- Paginable (10 items/página)
- Search box (por período o monto)
- Acciones: Descargar PDF, Enviar, Editar

---

#### `StatsCards.tsx`
Grid de tarjetas estadísticas.

**Props:**
```typescript
interface StatsCardsProps {
  stats: {
    label: string
    value: string | number
    icon: ReactNode
    color?: 'verde' | 'teal' | 'amarillo'
  }[]
}
```

**Ejemplos:**
- Contratos activos: 3
- Liquidaciones este mes: 3
- Costo total empleador: $1.500.000
- Fondos acumulados trabajador: $15.000.000

---

#### `CollapsibleCard.tsx`
Card expandible para mostrar/ocultar detalles.

**Props:**
```typescript
interface CollapsibleCardProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}
```

**Comportamiento:**
- Click en header toggle expand/collapse
- Transición suave Framer Motion
- Icono chevron rota

---

### Form Components

#### `MultiStepForm.tsx`
Form de un-paso-por-pantalla (ver forms.md para detalles).

**Props:**
```typescript
interface MultiStepFormProps {
  steps: FormStep[]
  onComplete: (answers: Record<string, any>) => void
  title?: string
  showProgress?: boolean
}
```

**Features:**
- Framer Motion transiciones verticales
- Barra progreso visual
- Validación Zod por paso
- Persistencia localStorage
- Bifurcaciones {{#if}}

---

### Simulador Components

#### `SimuladorLiquidacion.tsx`
Form público para simular liquidaciones sin login.

**Props:**
```typescript
interface SimuladorLiquidacionProps {
  onCalculate?: (resultado: ResultadoLiquidacion) => void
}
```

**Campos:**
- Sueldo pactado
- Tipo sueldo (liquido|imponible|bruto)
- AFP (dropdown)
- Días trabajados
- Horas extra
- Cargas familiares
- Email (para guardar simulación)

---

#### `ResultadoLiquidacion.tsx`
Muestra resultado desglosado en 3 secciones expandibles.

**Props:**
```typescript
interface ResultadoLiquidacionProps {
  resultado: ResultadoLiquidacion
  showPDFButton?: boolean
  onDownloadPDF?: () => void
}
```

**Secciones:**
1. **Haberes** — Tabla con todos los ingresos
2. **Descuentos** — Tabla con AFP, salud, IUSC, etc.
3. **Cotizaciones Empleador** — Tabla con SIS, ISL, etc.

**Layout:**
```
┌─────────────────────────────────┐
│ HABERES                    [↑/↓]
├─────────────────────────────────┤
│ Sueldo base      $500.000
│ Colación         $50.000
│ Horas extra      $100.000
│ ──────────────────────────
│ TOTAL HABERES    $650.000
└─────────────────────────────────┘

(similar para DESCUENTOS y COTIZACIONES)

┌─────────────────────────────────┐
│ RESULTADO FINAL
│ Bruto:          $650.000
│ Descuentos:     -$120.000
│ LÍQUIDO:        $530.000  ← highlight verde
│ Costo empleador: $650.000 + $50.000 cotiz
└─────────────────────────────────┘
```

---

## Design Principles

1. **Mobile-first** — Diseñar mobile primero, luego desktop
2. **Accesibilidad** — Contraste 4.5:1, labels asociados
3. **Transiciones sutiles** — Framer Motion, no disruptivas
4. **Feedback visual** — Disabled states, loading, errors
5. **Responsivo** — 320px mobile, 768px tablet, 1024px desktop
6. **Espaçamento** — Usar escala 4px (padding: 4px, 8px, 12px, 16px, 20px)

---

## Ejemplo de Integración

```typescript
// pages/dashboard.tsx
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatsCards } from '@/components/StatsCards'
import { ContractCard } from '@/components/ContractCard'

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-[#f4f4f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-6">
          <StatsCards stats={[...]} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {contratos.map(c => (
              <ContractCard key={c.id} contrato={c} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
```
