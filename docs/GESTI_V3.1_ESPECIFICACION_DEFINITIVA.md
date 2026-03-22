# GESTI V3.1 — Especificación Definitiva

> **Versión:** 3.1 (consolidada con correcciones auditadas)  
> **Fecha:** Marzo 2026  
> **Stack:** Next.js 14 + TypeScript + Supabase + Tailwind + shadcn/ui  
> **Destinatario:** Claude Code (implementación directa)  
> **Archivos que reemplaza:** `GESTI_V3_DISENO_SOLUCION.md` + `GESTI_V3_IMPLEMENTACION.md`

---

## ÍNDICE

1. [Análisis del Sistema Actual (V2)](#1-análisis-del-sistema-actual-v2)
2. [Cambios Legislativos — Reforma Previsional 2025](#2-cambios-legislativos)
3. [Análisis Campo por Campo — Liquidación de Sueldo](#3-análisis-campo-por-campo)
4. [Motor de Cálculo V3.1 (CORREGIDO)](#4-motor-de-cálculo-v31)
5. [Fundamento Legal IUSC y Algoritmo Correcto](#5-fundamento-legal-iusc)
6. [Motor de Contratos y Plantillas](#6-motor-de-contratos)
7. [Sistema de Indicadores Automáticos](#7-sistema-de-indicadores)
8. [Base de Datos Supabase](#8-base-de-datos-supabase)
9. [Arquitectura Técnica](#9-arquitectura-técnica)
10. [Sistema de Formularios](#10-sistema-de-formularios)
11. [Notificaciones y Emails](#11-notificaciones-y-emails)
12. [Diseño UX/UI](#12-diseño-uxui)
13. [API Endpoints](#13-api-endpoints)
14. [Canal WhatsApp + LLM](#14-canal-whatsapp)
15. [Migración V2→V3 (Fase 0)](#15-migración-v2v3)
16. [Casos de Prueba Obligatorios](#16-casos-de-prueba)
17. [Plan de Implementación](#17-plan-de-implementación)

---

## 1. Análisis del Sistema Actual (V2)

### 1.1 Arquitectura V2

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │  Google Sheets   │     │  Google Apps    │
│   React (PWA)   │────▶│  (Base de datos) │◀───▶│  Script (Back)  │
│   gesti.cl      │     │  8 hojas         │     │  Código.js      │
└────────┬────────┘     └────────┬────────┘     │  Liquidaciones  │
         │                       │               │  de_sueldo.js   │
         │              ┌────────▼────────┐     └────────┬────────┘
         │              │  Supabase       │              │
         └─────────────▶│  (Auth + datos) │              │
                        └─────────────────┘     ┌────────▼────────┐
                                                │  Google Drive   │
┌─────────────────┐     ┌─────────────────┐     │  (PDFs)         │
│   Typeform      │────▶│  Google Sheets   │     └─────────────────┘
│   (Formularios) │     │  (webhook)       │
└─────────────────┘     └─────────────────┘     ┌─────────────────┐
                                                │  Gmail (envíos) │
                                                └─────────────────┘
```

### 1.2 Problemas Identificados

| Problema | Impacto |
|----------|---------|
| Google Sheets como BD | Límite de filas, sin relaciones, sin índices, concurrencia limitada |
| Apps Script como backend | Timeout 6 min, triggers frágiles |
| Typeform ($$$) | Costo mensual, dependencia de tercero |
| Indicadores hardcodeados | Tasas AFP y previsionales fijas en código, cambian mensualmente |
| Sin impuesto a la renta (IUSC) | El cálculo V2 NO incluye Impuesto Único de 2da Categoría |
| Sin reforma previsional | Faltan 4 nuevas cotizaciones empleador (Ley 21.735) |
| Cesantía mal calculada | V2 descontaba cesantía al trabajador TCP (debería ser 0%) |
| SIS con tasa desactualizada | V2 usa 1,78%, actual es 1,54% |
| Licencia médica sin prorrateo | Solo flag, no calcula proporcional |

### 1.3 Hojas del Google Sheet Actual

| Hoja | Cols | Filas | Propósito |
|------|------|-------|-----------|
| ContratoGesti | 58 | ~60 | Datos completos del contrato |
| LiquidacionSueldo | 40+ | ~122 | Liquidaciones mensuales |
| IndicadoresPrevisionales | 3 | 14 | Tasas AFP, SIS, cesantía (estáticas) |
| user_billing | 10 | ~8 | Planes y pagos |
| user_profiles | 10 | ~1 | Perfiles básicos |
| Permisos | 7 | ~2 | Permisos, vacaciones |

### 1.4 Lógica de Selección de Plantilla de Contrato

```
Combinación: tipoContrato × jornada × documentoID = 8 plantillas

Puertas Afuera + Full Time + RUT       → PFFTRUTG
Puertas Afuera + Full Time + Pasaporte → PFFTSINRUTG
Puertas Afuera + Part Time + RUT       → PFPTRUTG
Puertas Afuera + Part Time + Pasaporte → PFPTSINRUTG
Puertas Adentro + Full Time + RUT      → PAFTRUT
Puertas Adentro + Full Time + Pasaporte→ PAFTSINRUT
Puertas Adentro + Part Time + RUT      → PAFTRUT (mismo)
Puertas Adentro + Part Time + Pasaporte→ PAFTSINRUT (mismo)
```

Variables en plantillas: datos empleador, datos trabajador (rut/pasaporte), jornada (entrada/salida L-S), colación, tareas, sueldo, fecha, firmas.

---

## 2. Cambios Legislativos

### 2.1 Ley 21.735 — Reforma Previsional (vigente desde 08/2025)

4 nuevas cotizaciones de **cargo del empleador**:

| Cotización | Tasa Final | Inicio | Cargo de |
|-----------|-----------|--------|----------|
| Capitalización Individual (AFP) | 4,5% de RI | 08/2025 con 0,1% | Empleador |
| Expectativa de Vida | 1,0% de RI | 08/2025 con 0,9% | Empleador |
| Rentabilidad Protegida | 1,5% de RI | 08/2026 con 0,9% | Empleador |
| SIS (migra a Seguro Social) | 1,5% de RI | 08/2026 | Empleador |

### 2.2 Gradualidad (desde agosto de cada año)

| Año | AFP/Cap.Indiv. | Expect.Vida | Rentab.Proteg. | SIS (SS) | Total |
|-----|---------------|-------------|---------------|---------|-------|
| 2025 (ago) | 0,10% | 0,90% | — | — | 1,00% |
| 2026 (ago) | 0,10% | 1,00% | 0,90% | 1,50% | 3,50% |
| 2027 (ago) | 0,25% | 1,00% | 1,50% | 1,50% | 4,25% |
| 2028 (ago) | 1,00% | 1,00% | 1,50% | 1,50% | 5,00% |
| 2029 (ago) | 1,70% | 1,00% | 1,50% | 1,50% | 5,70% |
| 2030 (ago) | 2,40% | 1,00% | 1,50% | 1,50% | 6,40% |
| 2031 (ago) | 3,10% | 1,00% | 1,50% | 1,50% | 7,10% |
| 2032 (ago) | 3,80% | 1,00% | 1,50% | 1,50% | 7,80% |
| 2033 (ago) | 4,50% | 1,00% | 1,50% | 1,50% | 8,50% |

### 2.3 Aplica a TCP

- **Trabajadores Activos e Invalidez Parcial** en AFP → SÍ aplican las 4 cotizaciones
- Pensionados, mayores de 65, exentos → NO aplican
- Jornada Completa = >30 hrs semanales / Parcial = ≤30 hrs

### 2.4 Licencias Médicas — Prorrateo

**Subsidio total (todo el mes):**
- Cap.Individual y Rentab.Protegida → cargo Pagador de Subsidios
- Expectativa de Vida y SIS → cargo Empleador

**Subsidio parcial:**
- Cap.Individual: 4,5% × RI × (días trabajados/30)
- Rentab.Protegida: 1,5% × RI × (días trabajados/30)
- SIS: 1,5% × RI × (días trabajados/30) + 1,5% × (RIMA/30 × días licencia)
- Expect.Vida: 1% × RI × (días trabajados/30) + 1% × (RIMA/30 × días licencia)

> **RIMA** = Renta Imponible Mensual Anterior. Campo obligatorio en `InputLiquidacion` para meses con licencia. Se autocompleta desde la liquidación del mes anterior en Supabase.

### 2.5 Indicadores Previsionales Vigentes (Marzo 2026)

| Indicador | Valor |
|-----------|-------|
| UF (31/03/2026) | $39.841,72 |
| UTM Marzo 2026 | $69.889 |
| UTA | $838.668 |
| Sueldo Mínimo TCP | $539.000 |
| Renta Tope AFP (90 UF) | $3.585.755 |
| Renta Tope Cesantía (135,2 UF) | $5.386.601 |
| Tasa SIS | 1,54% |
| Expectativa Vida | 0,9% |
| Cap.Individual Empleador | 0,1% |

**Tasas AFP (cargo trabajador):**

| AFP | Trabajador | Empleador | Total |
|-----|-----------|----------|-------|
| Capital | 11,44% | 0,1% | 11,54% |
| Cuprum | 11,44% | 0,1% | 11,54% |
| Habitat | 11,27% | 0,1% | 11,37% |
| PlanVital | 11,16% | 0,1% | 11,26% |
| Provida | 11,45% | 0,1% | 11,55% |
| Modelo | 10,58% | 0,1% | 10,68% |
| Uno | 10,46% | 0,1% | 10,56% |

**Cesantía TCP:** Empleador 3,0% / Trabajador 0% (todo tipo de contrato).

**Asignación Familiar Marzo 2026:**

| Tramo | Monto | Renta hasta |
|-------|-------|-------------|
| A | $22.007 | ≤ $631.976 |
| B | $13.505 | ≤ $923.067 |
| C | $4.267 | ≤ $1.439.668 |
| D | $0 | > $1.439.668 |

---

## 3. Análisis Campo por Campo

### 3.1 HABERES

| Campo | V2 | V3.1 | Estado |
|-------|-----|------|--------|
| Sueldo Base Imponible | ✅ `líquido/(1-AFP-0.07)` | ✅ Misma fórmula + bisección con IUSC para sueldos altos. Bisección usa RLI como base del IUSC. | CORREGIDO |
| Gratificación | ❌ | ✅ Opcional. 25% sueldo con tope 4,75 IMM | NUEVO |
| Colación/Movilización | ✅ | ✅ Sin cambio, no imponible | OK |
| Horas Extra | ✅ | ✅ `1.5×(base×7)/(totalHoras×30)×hh_extra`. Imponible. | OK |
| Asignación Familiar | ⚠️ Solo simulador | ✅ En simulador Y liquidación real. No imponible. | NUEVO |
| Otros Bonos | ⚠️ Solo simulador | ✅ Campo genérico no imponible | NUEVO |

### 3.2 DESCUENTOS DEL TRABAJADOR

| Campo | V2 | V3.1 | Estado |
|-------|-----|------|--------|
| AFP (cargo trabajador) | ✅ | ✅ `imponible_ajustado × tasaAFP`. Tasa NO cambia con reforma. | OK |
| Salud (7%) | ✅ | ✅ `imponible_ajustado × 0.07` | OK |
| Cesantía trabajador | ⚠️ Se descontaba | ✅ **TCP = 0% siempre**. Corregido. | CORREGIDO |
| **IUSC (Impuesto Renta)** | ❌ No existía | ✅ **SOBRE RLI** = imponible − AFP − Salud − APV Rég.B. Art. 42 N°1 DL 824. | NUEVO+CORREGIDO |
| APV / Previsión Voluntaria | ❌ | ✅ Con distinción Régimen A (no afecta RLI) vs Régimen B (reduce RLI hasta 50 UF/mes) | NUEVO |
| Anticipo | ✅ | ✅ Se resta del total pago | OK |

### 3.3 COTIZACIONES DEL EMPLEADOR

| Campo | V2 | V3.1 | Estado |
|-------|-----|------|--------|
| SIS | ✅ 1,78% (desactualizado) | ✅ **1,54%** (marzo 2026). Desde 08/2026: 1,50% al Seguro Social. | ACTUALIZADO |
| ISL Accidentes | ✅ 0,93% | ✅ Sin cambio | OK |
| Indemnización Obligatoria | ✅ 1,11% | ✅ Sin cambio | OK |
| Cesantía Empleador | ✅ 3,0% | ✅ Con tope: `MIN(base, renta_tope_cesantia)` | OK |
| Cap.Individual AFP (Reforma) | ❌ | ✅ 0,1% desde 08/2025. Gradual hasta 4,5%. | NUEVO |
| Expectativa de Vida (Reforma) | ❌ | ✅ 0,9% → 1,0% en 08/2026. | NUEVO |
| Rentabilidad Protegida (Reforma) | ❌ | ✅ 0% → 0,9% en 08/2026. | NUEVO |
| Ley SANNA | ❌ | ✅ 0,03% opcional | NUEVO |
| RIMA para prorrateo licencias | ❌ | ✅ Campo requerido para meses con licencia parcial | NUEVO |

### 3.4 TOTALES

| Campo | V2 | V3.1 | Estado |
|-------|-----|------|--------|
| Sueldo Líquido | ✅ `imponible×(1-AFP-0.07)` | ✅ `imponible − AFP − Salud − IUSC − APV_B` | CORREGIDO |
| Total Pago Trabajador | ✅ | ✅ `líquido + no_imponibles − anticipo` | OK |
| Total Previred | ❌ | ✅ `descuentos_trabajador + cotizaciones_empleador` | NUEVO |
| Costo Total Empleador | ❌ | ✅ `total_pago + total_previred` | NUEVO |
| motor_version | ❌ | ✅ `"v3.1"` para auditoría y reproducibilidad | NUEVO |

---

## 4. Motor de Cálculo V3.1 (CORREGIDO)

### 4.1 Tipos

```typescript
// lib/calculos/liquidacion.ts

export interface IndicadoresPrevisionales {
  mes_vigencia: string;
  uf: number;
  utm: number;
  sueldo_minimo: number;
  renta_tope_afp: number;
  renta_tope_cesantia: number;
  tasas_afp: Record<string, { trabajador: number; total: number }>;
  tasa_salud: number; // 0.07
  tasa_sis: number; // 0.0154
  tasa_accidentes_trabajo: number; // 0.0093
  tasa_indemnizacion: number; // 0.0111
  tasa_cesantia_empleador: number; // 0.03
  tasa_afp_empleador: number; // 0.001
  tasa_expectativa_vida: number; // 0.009
  tasa_rentabilidad_protegida: number; // 0 (hasta julio 2026)
  tasa_ley_sanna: number; // 0.0003
  tramos_impuesto_mensual: TramoImpuesto[];
  tramos_asignacion_familiar: TramoAsignacionFamiliar[];
}

interface TramoImpuesto {
  desde: number;
  hasta: number | null;
  factor: number;
  rebaja: number;
}

interface TramoAsignacionFamiliar {
  tramo: string;
  monto: number;
  renta_hasta: number | null;
}

export interface InputLiquidacion {
  sueldo_pactado: number;
  tipo_sueldo: 'liquido' | 'imponible';
  afp: string;
  horas_semanales: number;
  colacion: number;
  movilizacion: number;
  otros_bonos: number;
  cargas_familiares: number;
  horas_faltadas: number;
  hh_extra: number;
  dias_licencia_medica: number;
  dias_vacaciones: number;
  anticipo: number;
  prevision_voluntaria: number;
  apv_regimen: 'A' | 'B' | null; // NUEVO v3.1 — null = sin APV
  rima: number | null; // NUEVO v3.1 — Renta Imponible Mes Anterior (para licencias)
  es_pensionado: boolean;
  mayor_65: boolean;
  exento_cotizacion: boolean;
}

export interface ResultadoLiquidacion {
  // Haberes
  sueldo_base_imponible: number;
  sueldo_imponible_ajustado: number;
  horas_extra_monto: number;
  descuento_inasistencia: number;
  asignacion_colacion: number;
  asignacion_movilizacion: number;
  otros_bonos: number;
  asignacion_familiar: number;
  tramo_asig_familiar: string;
  total_haberes_imponibles: number;
  total_haberes_no_imponibles: number;
  total_haberes: number;
  
  // Descuentos trabajador
  descuento_afp: number;
  tasa_afp_aplicada: number;
  descuento_salud: number;
  renta_liquida_imponible: number; // NUEVO v3.1 — RLI explícita
  impuesto_renta: number;
  tramo_impuesto: string;
  descuento_apv_b: number; // NUEVO v3.1
  anticipo: number;
  total_descuentos: number;
  
  // Resultado
  sueldo_liquido: number;
  total_pago_trabajador: number;
  
  // Cotizaciones empleador
  cotiz_sis: number;
  cotiz_accidentes_trabajo: number;
  cotiz_indemnizacion: number;
  cotiz_cesantia: number;
  cotiz_afp_empleador: number;
  cotiz_expectativa_vida: number;
  cotiz_rentabilidad_protegida: number;
  cotiz_ley_sanna: number;
  total_cotizaciones_empleador: number;
  
  // Totales
  total_previred: number;
  costo_total_empleador: number;
  
  // Info
  valor_hora: number;
  valor_hora_extra: number;
  cumple_minimo: boolean;
  ratio_vs_minimo: number;
  dias_trabajados: number;
  motor_version: string; // NUEVO v3.1
}
```

### 4.2 Función Principal — ALGORITMO CORREGIDO

```typescript
export function calcularLiquidacion(
  input: InputLiquidacion,
  indicadores: IndicadoresPrevisionales
): ResultadoLiquidacion {
  
  const MOTOR_VERSION = 'v3.1';
  
  // ══════════════════════════════════════════════════
  // PASO 1: Obtener tasa AFP del trabajador
  // ══════════════════════════════════════════════════
  const afpData = indicadores.tasas_afp[input.afp];
  if (!afpData) throw new Error(`AFP "${input.afp}" no encontrada`);
  const tasaAFP = afpData.trabajador;
  
  // ══════════════════════════════════════════════════
  // PASO 2: Calcular sueldo base imponible
  // ══════════════════════════════════════════════════
  let sueldoBase: number;
  
  if (input.tipo_sueldo === 'imponible') {
    sueldoBase = input.sueldo_pactado;
  } else {
    // Desde líquido: resolver bruto con bisección CORREGIDA
    sueldoBase = resolverBrutoDesdeNeto(
      input.sueldo_pactado, tasaAFP, indicadores
    );
  }
  
  // Tope imponible
  sueldoBase = Math.min(sueldoBase, indicadores.renta_tope_afp);
  
  // ══════════════════════════════════════════════════
  // PASO 3: Ajustes por eventos del mes
  // ══════════════════════════════════════════════════
  const valorHora = input.horas_semanales > 0 
    ? (sueldoBase * 7) / (input.horas_semanales * 30) 
    : 0;
  const valorHoraExtra = valorHora * 1.5;
  
  const descuentoInasistencia = Math.round(valorHora * input.horas_faltadas);
  const montoHorasExtra = Math.round(valorHoraExtra * input.hh_extra);
  
  const sueldoImponibleAjustado = Math.max(0,
    sueldoBase - descuentoInasistencia + montoHorasExtra
  );
  
  const diasTrabajados = 30 - input.dias_licencia_medica;
  
  // ══════════════════════════════════════════════════
  // PASO 4: Descuentos del trabajador (AFP + Salud)
  // ══════════════════════════════════════════════════
  const descuentoAFP = Math.round(sueldoImponibleAjustado * tasaAFP);
  const descuentoSalud = Math.round(sueldoImponibleAjustado * indicadores.tasa_salud);
  const descuentoCesantiaTrabajador = 0; // TCP SIEMPRE 0%
  
  // ══════════════════════════════════════════════════
  // PASO 5: APV Régimen B (reduce base tributaria)
  // ══════════════════════════════════════════════════
  const descuentoAPV_B = (input.apv_regimen === 'B' && input.prevision_voluntaria > 0)
    ? Math.min(input.prevision_voluntaria, indicadores.uf * 50)
    : 0;
  
  // ══════════════════════════════════════════════════
  // PASO 6: RENTA LÍQUIDA IMPONIBLE (base para IUSC)
  // ══════════════════════════════════════════════════
  // ⚖️ Art. 42 N°1 DL 824: RLI = Bruto - AFP - Salud - Cesantía - APV Rég.B
  // Para TCP: Cesantía trabajador = 0
  // ══════════════════════════════════════════════════
  const rli = sueldoImponibleAjustado 
    - descuentoAFP 
    - descuentoSalud 
    - descuentoCesantiaTrabajador 
    - descuentoAPV_B;
  
  // ══════════════════════════════════════════════════
  // PASO 7: IUSC — Impuesto sobre RLI (NO sobre bruto)
  // ══════════════════════════════════════════════════
  const { impuesto, tramo } = calcularImpuestoRenta(
    rli, // ← CORRECCIÓN v3.1: antes usaba sueldoImponibleAjustado
    indicadores.tramos_impuesto_mensual
  );
  
  // ══════════════════════════════════════════════════
  // PASO 8: Total descuentos y sueldo líquido
  // ══════════════════════════════════════════════════
  const totalDescuentosLegales = descuentoAFP + descuentoSalud + impuesto + descuentoAPV_B;
  const sueldoLiquido = sueldoImponibleAjustado - totalDescuentosLegales;
  
  // ══════════════════════════════════════════════════
  // PASO 9: Asignación familiar
  // ══════════════════════════════════════════════════
  const { monto: asigFamiliar, tramo: tramoAsig } = calcularAsignacionFamiliar(
    sueldoImponibleAjustado, input.cargas_familiares, 
    indicadores.tramos_asignacion_familiar
  );
  
  // ══════════════════════════════════════════════════
  // PASO 10: Total pago al trabajador
  // ══════════════════════════════════════════════════
  const totalNoImponible = input.colacion + input.movilizacion 
    + input.otros_bonos + asigFamiliar;
  const totalPago = sueldoLiquido + totalNoImponible - input.anticipo;
  
  // ══════════════════════════════════════════════════
  // PASO 11: Cotizaciones del empleador
  // ══════════════════════════════════════════════════
  const baseEmpleador = sueldoImponibleAjustado;
  const baseCesantia = Math.min(baseEmpleador, indicadores.renta_tope_cesantia);
  
  const cotizSIS = Math.round(baseEmpleador * indicadores.tasa_sis);
  const cotizAccidentes = Math.round(baseEmpleador * indicadores.tasa_accidentes_trabajo);
  const cotizIndemnizacion = Math.round(baseEmpleador * indicadores.tasa_indemnizacion);
  const cotizCesantia = Math.round(baseCesantia * indicadores.tasa_cesantia_empleador);
  
  // Reforma previsional
  const esExento = input.es_pensionado || input.mayor_65 || input.exento_cotizacion;
  let cotizAFPEmpleador = 0, cotizExpectativa = 0, cotizRentabilidad = 0;
  
  if (!esExento) {
    if (input.dias_licencia_medica === 0) {
      cotizAFPEmpleador = Math.round(baseEmpleador * indicadores.tasa_afp_empleador);
      cotizExpectativa = Math.round(baseEmpleador * indicadores.tasa_expectativa_vida);
      cotizRentabilidad = Math.round(baseEmpleador * indicadores.tasa_rentabilidad_protegida);
    } else if (input.dias_licencia_medica >= 30) {
      // Licencia total: Cap.Indiv y Rentab → Pagador Subsidios. Empleador paga Expect+SIS.
      cotizExpectativa = Math.round(baseEmpleador * indicadores.tasa_expectativa_vida);
    } else {
      // Licencia parcial: prorrateo con RIMA
      const ratioTrabajados = diasTrabajados / 30;
      const ratioLicencia = input.dias_licencia_medica / 30;
      const RIMA = input.rima ?? sueldoBase; // fallback al bruto actual
      
      cotizAFPEmpleador = Math.round(
        baseEmpleador * indicadores.tasa_afp_empleador * ratioTrabajados
      );
      cotizRentabilidad = Math.round(
        baseEmpleador * indicadores.tasa_rentabilidad_protegida * ratioTrabajados
      );
      cotizExpectativa = Math.round(
        (baseEmpleador * indicadores.tasa_expectativa_vida * ratioTrabajados) +
        (RIMA * indicadores.tasa_expectativa_vida * ratioLicencia)
      );
    }
  }
  
  const cotizSANNA = Math.round(baseEmpleador * indicadores.tasa_ley_sanna);
  
  const totalCotizEmpleador = cotizSIS + cotizAccidentes + cotizIndemnizacion 
    + cotizCesantia + cotizAFPEmpleador + cotizExpectativa + cotizRentabilidad + cotizSANNA;
  
  // ══════════════════════════════════════════════════
  // PASO 12: Totales finales
  // ══════════════════════════════════════════════════
  const totalPrevired = descuentoAFP + descuentoSalud + impuesto + totalCotizEmpleador;
  const costoTotal = totalPago + totalPrevired;
  
  // Validación sueldo mínimo
  const minProporcional = input.horas_semanales >= 30 
    ? indicadores.sueldo_minimo
    : (indicadores.sueldo_minimo / 45) * input.horas_semanales;
  
  return {
    sueldo_base_imponible: sueldoBase,
    sueldo_imponible_ajustado: sueldoImponibleAjustado,
    horas_extra_monto: montoHorasExtra,
    descuento_inasistencia: descuentoInasistencia,
    asignacion_colacion: input.colacion,
    asignacion_movilizacion: input.movilizacion,
    otros_bonos: input.otros_bonos,
    asignacion_familiar: asigFamiliar,
    tramo_asig_familiar: tramoAsig,
    total_haberes_imponibles: sueldoImponibleAjustado,
    total_haberes_no_imponibles: totalNoImponible,
    total_haberes: sueldoImponibleAjustado + totalNoImponible,
    descuento_afp: descuentoAFP,
    tasa_afp_aplicada: tasaAFP,
    descuento_salud: descuentoSalud,
    renta_liquida_imponible: rli,
    impuesto_renta: impuesto,
    tramo_impuesto: tramo,
    descuento_apv_b: descuentoAPV_B,
    anticipo: input.anticipo,
    total_descuentos: totalDescuentosLegales + input.anticipo,
    sueldo_liquido: sueldoLiquido,
    total_pago_trabajador: totalPago,
    cotiz_sis: cotizSIS,
    cotiz_accidentes_trabajo: cotizAccidentes,
    cotiz_indemnizacion: cotizIndemnizacion,
    cotiz_cesantia: cotizCesantia,
    cotiz_afp_empleador: cotizAFPEmpleador,
    cotiz_expectativa_vida: cotizExpectativa,
    cotiz_rentabilidad_protegida: cotizRentabilidad,
    cotiz_ley_sanna: cotizSANNA,
    total_cotizaciones_empleador: totalCotizEmpleador,
    total_previred: totalPrevired,
    costo_total_empleador: costoTotal,
    valor_hora: Math.round(valorHora),
    valor_hora_extra: Math.round(valorHoraExtra),
    cumple_minimo: sueldoBase >= minProporcional,
    ratio_vs_minimo: minProporcional > 0 ? Math.round(sueldoBase / minProporcional * 100) / 100 : 0,
    dias_trabajados: diasTrabajados,
    motor_version: MOTOR_VERSION,
  };
}
```

### 4.3 Función de Bisección — CORREGIDA

```typescript
// ══════════════════════════════════════════════════════════════
// REGLA CLAVE: La bisección calcula IUSC sobre RLI, no sobre bruto
// RLI = mid - AFP(mid) - Salud(mid) - APV_B
// ══════════════════════════════════════════════════════════════

function resolverBrutoDesdeNeto(
  netoDeseado: number,
  tasaAFP: number,
  indicadores: IndicadoresPrevisionales
): number {
  // Estimación inicial sin impuesto
  let brutoEstimado = netoDeseado / (1 - tasaAFP - indicadores.tasa_salud);
  
  // Verificar si la RLI caería en tramo con impuesto
  const afpEstimada = brutoEstimado * tasaAFP;
  const saludEstimada = brutoEstimado * indicadores.tasa_salud;
  const rliEstimada = brutoEstimado - afpEstimada - saludEstimada;
  const { impuesto } = calcularImpuestoRenta(rliEstimada, indicadores.tramos_impuesto_mensual);
  
  if (impuesto === 0) {
    return Math.ceil(brutoEstimado);
  }
  
  // Bisección
  let low = netoDeseado;
  let high = netoDeseado * 2.5;
  
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const afp = mid * tasaAFP;
    const salud = mid * indicadores.tasa_salud;
    
    // ⚠️ CORRECCIÓN v3.1: IUSC sobre RLI, NO sobre mid
    const rli = mid - afp - salud;
    const { impuesto: iusc } = calcularImpuestoRenta(rli, indicadores.tramos_impuesto_mensual);
    
    const netoCalculado = mid - afp - salud - iusc;
    
    if (Math.abs(netoCalculado - netoDeseado) < 1) {
      return Math.ceil(mid);
    }
    
    if (netoCalculado > netoDeseado) {
      high = mid;
    } else {
      low = mid;
    }
  }
  
  return Math.ceil((low + high) / 2);
}
```

### 4.4 Funciones Auxiliares

```typescript
function calcularImpuestoRenta(
  rli: number, // Renta Líquida Imponible, NO sueldo bruto
  tramos: TramoImpuesto[]
): { impuesto: number; tramo: string } {
  for (const t of tramos) {
    const enTramo = rli >= t.desde && (t.hasta === null || rli <= t.hasta);
    if (enTramo) {
      if (t.factor === 0) return { impuesto: 0, tramo: 'Exento' };
      const imp = Math.max(0, Math.round(rli * t.factor - t.rebaja));
      return { impuesto: imp, tramo: `${(t.factor * 100).toFixed(1)}%` };
    }
  }
  return { impuesto: 0, tramo: 'Exento' };
}

function calcularAsignacionFamiliar(
  rentaImponible: number,
  cargas: number,
  tramos: TramoAsignacionFamiliar[]
): { monto: number; tramo: string } {
  if (cargas <= 0) return { monto: 0, tramo: 'N/A' };
  for (const t of tramos) {
    if (t.renta_hasta === null || rentaImponible > t.renta_hasta) continue;
    return { monto: t.monto * cargas, tramo: t.tramo };
  }
  return { monto: 0, tramo: 'D' };
}

export function formatCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
  }).format(Math.round(monto));
}
```

---

## 5. Fundamento Legal IUSC y Algoritmo Correcto

### 5.1 Base Legal

> **Art. 42 N°1 DL 824 (Ley de Impuesto a la Renta):**  
> La Renta Líquida Imponible (RLI) = Sueldo Bruto Imponible MENOS las cotizaciones previsionales obligatorias de cargo del trabajador. Se descuentan ANTES del impuesto: AFP (10% + comisión), Salud (7%), Cesantía trabajador (0% para TCP). El APV Régimen B también reduce la base (hasta 50 UF/mes).

### 5.2 Orden Correcto de Cálculo

| Paso | Operación |
|------|-----------|
| 1 | Haberes imponibles = sueldo_base + horas_extra + gratificación |
| 2 | Ajuste inasistencias = base − (valor_hora × hrs_faltadas) + hrs_extra. Aplicar tope `MIN(base, renta_tope_afp)` |
| 3 | AFP = imponible_ajustado × tasaAFP |
| 4 | Salud = imponible_ajustado × 0.07 |
| 5 | Cesantía trabajador TCP = 0 |
| 6 | APV Régimen B = `MIN(apv_monto, UF × 50)`. Solo si `apv_regimen === "B"` |
| 7 | **RLI = imponible_ajustado − AFP − Salud − Cesantía − APV_B** |
| 8 | Buscar tramo en tabla SII con RLI (NO con imponible bruto) |
| 9 | IUSC = `MAX(0, ROUND(RLI × factor − rebaja))` |
| 10 | Sueldo líquido = imponible_ajustado − AFP − Salud − IUSC − APV_B |
| 11 | Total pago = líquido + colación + movilización + bonos + asig.familiar − anticipo |

### 5.3 Tabla IUSC Mensual — Marzo 2026 (UTM $69.889)

| T° | RLI desde | RLI hasta | Factor | Rebaja |
|----|-----------|-----------|--------|--------|
| 1 | — | $943.501 | Exento | — |
| 2 | $943.502 | $2.096.670 | 0,04 | $37.740 |
| 3 | $2.096.671 | $3.494.450 | 0,08 | $121.607 |
| 4 | $3.494.451 | $4.892.230 | 0,135 | $313.802 |
| 5 | $4.892.231 | $6.290.010 | 0,23 | $778.563 |
| 6 | $6.290.011 | $8.386.680 | 0,304 | $1.244.024 |
| 7 | $8.386.681 | $21.665.590 | 0,35 | $1.629.811 |
| 8 | $21.665.591 | y más | 0,40 | $2.713.091 |

> Los tramos se recalculan mensualmente con la UTM. La Edge Function `update-indicadores` debe scrapear la tabla del SII mensualmente.

### 5.4 Ejemplo Corregido — Sueldo líquido $1.500.000 (AFP Uno)

| Concepto | V3 original (error) | V3.1 corregido |
|----------|---------------------|----------------|
| Bruto | $1.817.301 | $1.817.301 |
| AFP Uno (10,46%) | −$190.090 | −$190.090 |
| Salud (7%) | −$127.211 | −$127.211 |
| **Base IUSC** | **$1.817.301 ← ERROR** | **$1.500.000 (RLI) ← CORRECTO** |
| IUSC | $34.952 | $22.260 |
| Líquido resultado | $1.465.048 | $1.477.740 |
| Diferencia | — | +$12.692/mes a favor del trabajador |

---

## 6. Motor de Contratos

### 6.1 Estrategia: Plantilla Unificada con Condicionales

En lugar de 8 archivos separados, se usa **1 plantilla HTML** con bloques `{{#if}}` para las diferencias (puertas adentro vs afuera, full vs part time, RUT vs pasaporte).

Las diferencias entre plantillas son:
- **Encabezado:** "Cédula de Identidad N°" vs "N° de Pasaporte"
- **Cláusula TERCERO:** Puertas adentro agrega párrafo de alimentación/alojamiento obligatorio
- **Cláusula QUINTO:** Puertas afuera tiene tabla de horarios; puertas adentro tiene régimen sin horario fijo
- **Cláusula QUINTO (variante):** Full time tiene "bolsa de 15 hrs adicionales"; part time dice "jornada parcial de X hrs"

### 6.2 Variables de la Plantilla

```typescript
interface VariablesContrato {
  // Condicionales
  es_rut: boolean;
  es_pasaporte: boolean;
  es_puertas_adentro: boolean;
  es_full_time: boolean;
  tipo_contrato_display: string; // "Puertas Afuera" | "Puertas Adentro"
  
  // Empleador
  nombres_empleador: string; apellidos_empleador: string;
  rut_empleador: string; direccion_empleador: string; comuna_empleador: string;
  
  // Trabajador
  nombres_trabajador: string; apellidos_trabajador: string;
  rut_trabajador: string; pasaporte_trabajador: string;
  nacimiento_trabajador: string; nacionalidad_trabajador: string;
  afp_trabajador: string; salud_trabajador: string;
  direccion_trabajador: string; comuna_trabajador: string;
  
  // Jornada (solo puertas afuera)
  entrada_lunes: string; salida_lunes: string; // ... hasta sábado
  inicio_colacion: string; fin_colacion: string;
  totalHoras: string; descanso: string; dias_semana: number;
  
  // Contrato
  tareas_contrato: string; tareas2_contrato: string; adicionales_contrato: string;
  fecha_inicio: string; sueldo_base: string;
  asignacion_colacion: string; asignacion_movilizacion: string;
  direccion_trabajo: string; comuna_trabajo: string;
  dia: string; mes: string; ano: string;
}
```

### 6.3 Generación de PDF

**Stack elegido (v3.1):** `puppeteer-core` + `@sparticuz/chromium` en **API Routes Next.js** (NO en Edge Functions).

```typescript
// app/api/generar-pdf/route.ts
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  await browser.close();
  return Buffer.from(pdf);
}
```

> **NO usar:** html-pdf-node (PhantomJS deprecado), @react-pdf/renderer (CSS limitado), puppeteer completo (muy pesado).

### 6.4 Template de Resumen de Pagos del Empleador

Incluye las nuevas cotizaciones reforma:
- Previsión (AFP)
- Previsión Voluntaria
- Salud (7%)
- IUSC (si aplica)
- Indemnización Obligatoria (1,11%)
- Seguro de Cesantía (3%)
- ISL Accidentes (0,93%)
- SIS (1,54%)
- Cotiz. Cap.Individual Reforma (0,1%)
- Cotiz. Expectativa de Vida (0,9%)
- Cotiz. Rentabilidad Protegida (cuando active)

---

## 7. Sistema de Indicadores Automáticos

### 7.1 Fuente y Frecuencia

URL permanente: `https://www.previred.com/web/previred/indicadores-previsionales`  
Frecuencia: Primer día de cada mes via `pg_cron`.

### 7.2 Edge Function con Validación y Log

```typescript
// supabase/functions/update-indicadores/index.ts

// 1. Scrape Previred (indicadores) + SII (tabla impuesto)
// 2. Validar rangos:
//    - UF entre 30.000 y 50.000
//    - Tasas AFP entre 0.10 y 0.13
//    - UTM entre 50.000 y 90.000
// 3. Si OK → upsert en indicadores_previsionales
// 4. Si FALLO → usar datos del mes anterior como fallback
// 5. SIEMPRE → INSERT en indicadores_actualizacion_log
// 6. Si FALLO → enviar email alerta al admin via Resend

// Determinar tasas reforma según gradualidad
function calcularTasasReforma(fecha: Date) {
  const gradualidad = [
    { desde: '2025-08', afp_emp: 0.001, expectativa: 0.009, rentabilidad: 0, sis_ss: 0 },
    { desde: '2026-08', afp_emp: 0.001, expectativa: 0.010, rentabilidad: 0.009, sis_ss: 0.015 },
    { desde: '2027-08', afp_emp: 0.0025, expectativa: 0.010, rentabilidad: 0.015, sis_ss: 0.015 },
    // ... hasta 2033
  ];
  const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
  let tasas = gradualidad[0];
  for (const g of gradualidad) { if (fechaStr >= g.desde) tasas = g; }
  return tasas;
}
```

### 7.3 Tabla de Log de Actualización

```sql
CREATE TABLE IF NOT EXISTS indicadores_actualizacion_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_vigencia TEXT NOT NULL,
  estado TEXT CHECK (estado IN ('ok', 'fallido', 'pendiente')),
  fuente TEXT,
  errores JSONB,
  valores_parseados JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.4 Cron en Supabase

```sql
SELECT cron.schedule('actualizar-indicadores', '0 8 1 * *',
  $$ SELECT net.http_post(
    url := 'https://sdobbpbagffmntjfcmuw.supabase.co/functions/v1/update-indicadores',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  ); $$
);
```

---

## 8. Base de Datos Supabase

### 8.1 Credenciales

```
Project URL: https://sdobbpbagffmntjfcmuw.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkb2JicGJhZ2ZmbW50amZjbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDQxMjUsImV4cCI6MjA4OTcyMDEyNX0.AOeJgngqKeM7vPnYsoe18ghkED9ey_jA6uIolcHK23Y
Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkb2JicGJhZ2ZmbW50amZjbXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0NDEyNSwiZXhwIjoyMDg5NzIwMTI1fQ.C_Umuvhj0bs0CInoeYiQv0ydbegnw7w4A1QhNxDKdew
```

### 8.2 Migración SQL Completa

```sql
-- ════════════════════════════════════════════════════
-- GESTI V3.1 — MIGRACIÓN SUPABASE
-- ════════════════════════════════════════════════════

-- 1. PERFILES DE USUARIO
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  rut TEXT,
  phone TEXT,
  address TEXT,
  comuna TEXT,
  role TEXT DEFAULT 'empleador' CHECK (role IN ('empleador', 'trabajador', 'admin')),
  profile_completed BOOLEAN DEFAULT false,
  first_contract_created BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, last_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name',''), COALESCE(NEW.raw_user_meta_data->>'last_name',''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. FACTURACIÓN
CREATE TABLE public.user_billing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro_mensual', 'pro_anual')),
  plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active', 'inactive', 'cancelled', 'trial')),
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own billing" ON public.user_billing FOR SELECT USING (auth.uid() = user_id);


-- 3. CONTRATOS
CREATE TABLE public.contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador','activo','enviado','firmado','terminado','simulado')),
  
  rut_empleador TEXT NOT NULL,
  nombres_empleador TEXT NOT NULL,
  apellidos_empleador TEXT NOT NULL,
  correo_empleador TEXT NOT NULL,
  direccion_empleador TEXT,
  comuna_empleador TEXT,
  
  rut_trabajador TEXT,
  pasaporte_trabajador TEXT,
  documento_tipo TEXT CHECK (documento_tipo IN ('rut', 'pasaporte')),
  nombres_trabajador TEXT NOT NULL,
  apellidos_trabajador TEXT NOT NULL,
  correo_trabajador TEXT,
  nacimiento_trabajador DATE,
  nacionalidad_trabajador TEXT,
  afp_trabajador TEXT,
  salud_trabajador TEXT DEFAULT 'Fonasa',
  direccion_trabajador TEXT,
  comuna_trabajador TEXT,
  
  jornada TEXT CHECK (jornada IN ('full_time', 'part_time')),
  tipo_contrato TEXT CHECK (tipo_contrato IN ('puertas_afuera', 'puertas_adentro')),
  horarios JSONB DEFAULT '{}',
  colacion_inicio TEXT,
  colacion_fin TEXT,
  total_horas_semanales NUMERIC(5,2),
  dias_semana INTEGER,
  
  tareas_hogar TEXT[],
  tareas_exterior TEXT[],
  tareas_adicionales TEXT,
  fecha_inicio DATE,
  tipo_sueldo TEXT CHECK (tipo_sueldo IN ('imponible', 'liquido')),
  sueldo_base NUMERIC(12,0),
  sueldo_liquido NUMERIC(12,0),
  asignacion_colacion NUMERIC(12,0) DEFAULT 0,
  asignacion_movilizacion NUMERIC(12,0) DEFAULT 0,
  direccion_trabajo TEXT,
  comuna_trabajo TEXT,
  
  es_pensionado BOOLEAN DEFAULT false,
  mayor_65 BOOLEAN DEFAULT false,
  exento_cotizacion BOOLEAN DEFAULT false,
  cargas_familiares INTEGER DEFAULT 0,
  apv_regimen TEXT CHECK (apv_regimen IN ('A', 'B')), -- v3.1
  
  pdf_url TEXT,
  plantilla_usada TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own" ON public.contratos FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_contratos_user ON public.contratos(user_id);
CREATE INDEX idx_contratos_token ON public.contratos(token);


-- 4. LIQUIDACIONES
CREATE TABLE public.liquidaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  periodo TEXT NOT NULL, -- "2026-03"
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','calculada','enviada','pagada')),
  
  dias_trabajados INTEGER DEFAULT 30,
  dias_licencia_medica INTEGER DEFAULT 0,
  dias_vacaciones INTEGER DEFAULT 0,
  horas_faltadas NUMERIC(6,2) DEFAULT 0,
  hh_extra NUMERIC(6,2) DEFAULT 0,
  anticipo NUMERIC(12,0) DEFAULT 0,
  otros_bonos NUMERIC(12,0) DEFAULT 0,
  prevision_voluntaria NUMERIC(12,0) DEFAULT 0,
  apv_regimen TEXT CHECK (apv_regimen IN ('A', 'B')), -- v3.1
  rima NUMERIC(12,0), -- v3.1: Renta Imponible Mes Anterior
  
  calculo JSONB DEFAULT '{}', -- ResultadoLiquidacion completo
  
  sueldo_imponible NUMERIC(12,0),
  sueldo_liquido NUMERIC(12,0),
  total_pago_trabajador NUMERIC(12,0),
  total_cotizaciones_empleador NUMERIC(12,0),
  total_previred NUMERIC(12,0),
  costo_total_empleador NUMERIC(12,0),
  
  pdf_liquidacion_url TEXT,
  pdf_resumen_pagos_url TEXT,
  indicadores_usados JSONB,
  motor_version TEXT DEFAULT 'v3.1', -- v3.1
  
  fecha_pago DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own" ON public.liquidaciones FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_liq_contrato ON public.liquidaciones(contrato_id);
CREATE UNIQUE INDEX idx_liq_contrato_periodo ON public.liquidaciones(contrato_id, periodo);


-- 5. PERMISOS
CREATE TABLE public.permisos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'vacaciones','licencia_medica','permiso_sin_goce','permiso_con_goce',
    'feriado_legal','dia_administrativo','licencia_maternal','licencia_paternal'
  )),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_habiles INTEGER,
  observaciones TEXT,
  documento_url TEXT,
  estado TEXT DEFAULT 'solicitado' CHECK (estado IN ('solicitado','aprobado','rechazado','cancelado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own" ON public.permisos FOR ALL USING (auth.uid() = user_id);


-- 6. INDICADORES PREVISIONALES
CREATE TABLE public.indicadores_previsionales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_vigencia TEXT NOT NULL UNIQUE,
  uf NUMERIC(12,2), utm NUMERIC(12,0), uta NUMERIC(12,0),
  sueldo_minimo NUMERIC(12,0) DEFAULT 539000,
  sueldo_minimo_menores NUMERIC(12,0) DEFAULT 402082,
  sueldo_minimo_tcp NUMERIC(12,0) DEFAULT 539000,
  renta_tope_afp NUMERIC(12,0),
  renta_tope_inp NUMERIC(12,0),
  renta_tope_cesantia NUMERIC(12,0),
  tasas_afp JSONB,
  tasa_salud NUMERIC(6,4) DEFAULT 0.07,
  tasa_sis NUMERIC(6,4) DEFAULT 0.0154,
  tasa_accidentes_trabajo NUMERIC(6,4) DEFAULT 0.0093,
  tasa_indemnizacion NUMERIC(6,4) DEFAULT 0.0111,
  tasa_cesantia_empleador NUMERIC(6,4) DEFAULT 0.03,
  tasa_ley_sanna NUMERIC(6,4) DEFAULT 0.0003,
  tasa_afp_empleador NUMERIC(6,4) DEFAULT 0.001,
  tasa_expectativa_vida NUMERIC(6,4) DEFAULT 0.009,
  tasa_rentabilidad_protegida NUMERIC(6,4) DEFAULT 0,
  tramos_asignacion_familiar JSONB,
  tramos_impuesto_mensual JSONB,
  tope_apv_mensual NUMERIC(12,0),
  tope_apv_anual NUMERIC(12,0),
  fuente TEXT DEFAULT 'previred.com',
  actualizado_por TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- 7. LOG DE ACTUALIZACIÓN DE INDICADORES (v3.1)
CREATE TABLE public.indicadores_actualizacion_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_vigencia TEXT NOT NULL,
  estado TEXT CHECK (estado IN ('ok', 'fallido', 'pendiente')),
  fuente TEXT,
  errores JSONB,
  valores_parseados JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 8. NOTIFICACIONES
CREATE TABLE public.notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'contrato_generado','liquidacion_lista','pago_pendiente',
    'permiso_aprobado','recordatorio_liquidacion','plan_por_vencer',
    'indicadores_actualizados','firma_pendiente'
  )),
  titulo TEXT NOT NULL,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  canal TEXT DEFAULT 'app' CHECK (canal IN ('app','email','whatsapp','push')),
  enviada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own" ON public.notificaciones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own" ON public.notificaciones FOR UPDATE USING (auth.uid() = user_id);


-- 9. SIMULACIONES (público, sin auth)
CREATE TABLE public.simulaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  tipo TEXT CHECK (tipo IN ('liquidacion', 'contrato')),
  input JSONB NOT NULL,
  resultado JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 10. CONFIG SISTEMA
CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_config (key, value) VALUES
  ('gradualidad_reforma', '{
    "2025-08":{"afp_emp":0.001,"expectativa":0.009,"rentabilidad":0,"sis_ss":0},
    "2026-08":{"afp_emp":0.001,"expectativa":0.010,"rentabilidad":0.009,"sis_ss":0.015},
    "2027-08":{"afp_emp":0.0025,"expectativa":0.010,"rentabilidad":0.015,"sis_ss":0.015},
    "2028-08":{"afp_emp":0.010,"expectativa":0.010,"rentabilidad":0.015,"sis_ss":0.015}
  }'::jsonb);


-- 11. STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);
```

### 8.3 Seed de Indicadores Marzo 2026

```sql
INSERT INTO indicadores_previsionales (
  mes_vigencia, uf, utm, uta, sueldo_minimo, sueldo_minimo_tcp,
  renta_tope_afp, renta_tope_cesantia,
  tasas_afp, tasa_salud, tasa_sis, tasa_accidentes_trabajo,
  tasa_indemnizacion, tasa_cesantia_empleador,
  tasa_afp_empleador, tasa_expectativa_vida, tasa_rentabilidad_protegida,
  tasa_ley_sanna, tope_apv_mensual,
  tramos_asignacion_familiar, tramos_impuesto_mensual
) VALUES (
  '2026-03', 39841.72, 69889, 838668, 539000, 539000,
  3585755, 5386601,
  '{"Capital":{"trabajador":0.1144,"total":0.1154},"Cuprum":{"trabajador":0.1144,"total":0.1154},"Habitat":{"trabajador":0.1127,"total":0.1137},"PlanVital":{"trabajador":0.1116,"total":0.1126},"Provida":{"trabajador":0.1145,"total":0.1155},"Modelo":{"trabajador":0.1058,"total":0.1068},"Uno":{"trabajador":0.1046,"total":0.1056}}'::jsonb,
  0.07, 0.0154, 0.0093, 0.0111, 0.03,
  0.001, 0.009, 0, 0.0003, 1992086,
  '[{"tramo":"A","monto":22007,"renta_hasta":631976},{"tramo":"B","monto":13505,"renta_hasta":923067},{"tramo":"C","monto":4267,"renta_hasta":1439668},{"tramo":"D","monto":0,"renta_hasta":null}]'::jsonb,
  '[{"desde":0,"hasta":943501,"factor":0,"rebaja":0},{"desde":943502,"hasta":2096670,"factor":0.04,"rebaja":37740},{"desde":2096671,"hasta":3494450,"factor":0.08,"rebaja":121607},{"desde":3494451,"hasta":4892230,"factor":0.135,"rebaja":313802},{"desde":4892231,"hasta":6290010,"factor":0.23,"rebaja":778563},{"desde":6290011,"hasta":8386680,"factor":0.304,"rebaja":1244024},{"desde":8386681,"hasta":21665590,"factor":0.35,"rebaja":1629811},{"desde":21665591,"hasta":null,"factor":0.40,"rebaja":2713091}]'::jsonb
);
```

---

## 9. Arquitectura Técnica

```
┌──────────────────────────────────────────────┐
│ FRONTEND — Next.js 14 (App Router) + TS      │
│ Tailwind + shadcn/ui + Framer Motion         │
│ React Hook Form + Zod                         │
│ PWA (next-pwa)                                │
└─────────────────────┬────────────────────────┘
                      ▼
┌──────────────────────────────────────────────┐
│ BACKEND — Next.js API Routes + Server Actions│
│ Supabase JS Client (auth + DB + storage)     │
│ puppeteer-core + @sparticuz/chromium (PDFs)  │
│ Resend (emails transaccionales)              │
└─────────────────────┬────────────────────────┘
                      ▼
┌──────────────────────────────────────────────┐
│ SUPABASE                                      │
│ PostgreSQL + Auth + Storage + Realtime        │
│ Edge Functions (update-indicadores)           │
│ pg_cron (tareas programadas)                  │
└──────────────────────────────────────────────┘
```

### 9.1 Estructura del Proyecto

```
gesti-v3/
├── app/
│   ├── (auth)/login/ | register/ | layout.tsx
│   ├── (dashboard)/
│   │   ├── contratos/ (page, [id], nuevo)
│   │   ├── liquidaciones/ (page, [id], nueva/[contratoId])
│   │   ├── permisos/ | perfil/ | facturacion/ | cartola/
│   │   └── layout.tsx (Sidebar + Header)
│   ├── (public)/ landing | simulador | simulador-contrato
│   ├── api/
│   │   ├── calcular-liquidacion/route.ts
│   │   ├── generar-pdf/route.ts
│   │   ├── webhooks/ (stripe, whatsapp)
│   │   └── cron/indicadores/route.ts
│   └── layout.tsx
├── components/ (ui, forms, dashboard, simulador, shared)
├── lib/
│   ├── supabase/ (client, server, middleware)
│   ├── calculos/ (liquidacion.ts, impuesto-renta.ts, asignacion-familiar.ts)
│   ├── auth/checkPlanAccess.ts  ← v3.1 middleware
│   ├── pdf/ (generar-contrato, generar-liquidacion, templates/)
│   ├── email/ (resend.ts, templates/)
│   └── whatsapp/ (handler.ts)
├── supabase/ (migrations/, functions/)
├── scripts/migrate-v2-to-v3.ts  ← v3.1 Fase 0
└── templates/contratos/ (plantilla unificada HTML)
```

### 9.2 Middleware de Plan (v3.1 — Fase 1)

```typescript
// lib/auth/checkPlanAccess.ts
export type Feature =
  | 'contratos_ilimitados' | 'liquidaciones_ilimitadas'
  | 'pdf_descarga' | 'whatsapp_bot' | 'multi_contrato';

export async function checkPlanAccess(
  userId: string, feature: Feature
): Promise<{ allowed: boolean; reason?: string }> {
  // FASE 1: siempre true (early access)
  // FASE 6: implementar lógica real de planes
  return { allowed: true };
}
```

---

## 10. Sistema de Formularios

Motor `MultiStepForm` que replica experiencia Typeform: una pregunta por pantalla, transiciones animadas, validación en tiempo real, bifurcaciones condicionales.

El mismo array de `FormStep[]` es consumible por el runner web Y por el bot de WhatsApp (restricción de diseño v3.1).

### 10.1 Formulario de Contrato — 4 Secciones + Campos Nuevos v3.1

Sección 1: Datos empleador (6 campos)  
Sección 2: Datos trabajador (12 campos + bifurcación RUT/Pasaporte + **nuevos:** `es_pensionado`, `cargas_familiares`)  
Sección 3: Jornada (16 campos horarios + tipo jornada + modalidad)  
Sección 4: Condiciones contrato (11 campos + bifurcación tipo sueldo)

### 10.2 Validador de RUT

```typescript
export function validarRUT(rut: string): boolean {
  const cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleaned.length < 2) return false;
  const dv = cleaned.slice(-1);
  const numero = cleaned.slice(0, -1);
  let suma = 0, mult = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += parseInt(numero[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const dvEsp = 11 - (suma % 11);
  const dvCalc = dvEsp === 11 ? '0' : dvEsp === 10 ? 'K' : String(dvEsp);
  return dv === dvCalc;
}
```

---

## 11. Notificaciones y Emails

Proveedor: **Resend** (transaccional).

3 templates principales: contrato generado, liquidación lista, recordatorio mensual.

Cron recordatorios: día 25 y último día de cada mes.

Notificaciones in-app via Supabase Realtime (`postgres_changes` en tabla `notificaciones`).

---

## 12. Diseño UX/UI

### Paleta de Colores (conservada)

| Color | Hex | Uso |
|-------|-----|-----|
| Verde principal | `#6fc8a0` | CTAs, badges, accents |
| Verde hover | `#c1e5d4` | Hover suave |
| Teal oscuro | `#135e5f` | Títulos, dark accents |
| Amarillo | `#ffde59` | Secundario, highlights |
| Gris oscuro | `#2f2e40` | Texto principal |
| Background | `#f4f4f9` | Fondos |

Tipografía: **Poppins** (Google Fonts). Headings: 600, Body: 400.

Principios: Minimalismo, mobile-first, micro-interacciones, accesibilidad WCAG AA.

---

## 13. API Endpoints

### Públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/calcular-liquidacion` | Simulador público |
| POST | `/api/auth/register` | Supabase Auth signUp |
| POST | `/api/auth/login` | Supabase Auth signIn |

### Privados (JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/contratos` | CRUD contratos |
| POST | `/api/contratos/[id]/generar-pdf` | Generar PDF contrato |
| GET/POST | `/api/liquidaciones` | CRUD liquidaciones |
| POST | `/api/liquidaciones/[id]/generar-pdf` | PDFs liquidación + resumen |
| POST | `/api/liquidaciones/[id]/enviar` | Email |
| GET/POST | `/api/permisos` | CRUD permisos |
| GET | `/api/indicadores?mes=2026-03` | Indicadores |
| GET/POST | `/api/billing` | Plan + checkout |
| GET/PATCH | `/api/notificaciones` | Notificaciones |

### Webhooks

| Ruta | Origen |
|------|--------|
| `/api/webhooks/stripe` | Confirmación de pago |
| `/api/webhooks/whatsapp` | Mensajes entrantes |

---

## 14. Canal WhatsApp + LLM

Flujos: simulación de liquidación, crear contrato (conversacional), datos mensuales para liquidación, consultas legislación (Claude API).

Estado conversacional persistido en Supabase.

---

## 15. Migración V2→V3 (Fase 0)

```typescript
// scripts/migrate-v2-to-v3.ts
// 1. Leer hojas Google Sheet via Google Sheets API v4
//    - ContratoGesti (58 cols, ~60 filas)
//    - LiquidacionSueldo (40+ cols, ~122 filas)
// 2. Mapear columnas del Sheet → campos tablas Supabase
// 3. Upsert con manejo de conflictos
// 4. Log filas migradas vs errores
// 5. Ejecutar con --dry-run por defecto
//
// Variables: GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_KEY
```

---

## 16. Casos de Prueba Obligatorios

### AFP Uno (10,46%), Marzo 2026, sin colación/movilización/bonos

**Caso 1: Sueldo líquido $500.000**
- Bruto esperado: ~$605.767
- AFP: $63.363 | Salud: $42.404
- RLI: $500.000 → IUSC: $0 (exento, RLI < $943.501)
- Líquido: $500.000 ✓

**Caso 2: Sueldo líquido $1.000.000**
- Bruto: ~$1.211.533
- AFP: $126.726 | Salud: $84.807
- RLI: $1.000.000 → IUSC: $2.260 (tramo 2: $1M × 0.04 − $37.740)
- Líquido: ~$997.740 ✓

**Caso 3: Sueldo líquido $1.500.000**
- Bruto: ~$1.817.301
- AFP: $190.090 | Salud: $127.211
- RLI: $1.500.000 → IUSC: $22.260 (tramo 2: $1.5M × 0.04 − $37.740)
- Líquido: ~$1.477.740 ✓

**Caso 4: Sueldo líquido $2.000.000**
- Requiere bisección (RLI cruza tramo 2)
- Bruto: ~$2.626.000 (la bisección debe converger)
- Líquido neto: $2.000.000 ✓

**Caso 5: Trabajador pensionado**
- cotiz_afp_empleador, cotiz_expectativa_vida, cotiz_rentabilidad → todos $0
- Resto del cálculo normal

**Caso 6: Cesantía TCP**
- Descuento cesantía trabajador = $0 siempre
- cotiz_cesantia empleador > 0 (3%)

**Caso 7: Licencia médica parcial (15 días)**
- Cotizaciones reforma prodrateadas al 50%
- dias_trabajados = 15

---

## 17. Plan de Implementación

### Orden de Ejecución para Claude Code

```
FASE 0 — MIGRACIÓN (Previo a todo)
├── Script migrate-v2-to-v3.ts
└── Backup de Google Sheets

FASE 1 — FUNDAMENTOS (Sem 1-2)
├── Next.js + TS + Tailwind + shadcn/ui
├── Supabase: ejecutar migración SQL completa
├── Auth (login, register, perfil) con Supabase Auth
├── Layout dashboard (sidebar, header, responsive)
├── Seed indicadores Marzo 2026
└── Middleware checkPlanAccess (retorna true)

FASE 2 — MOTOR DE CÁLCULO (Sem 2-3)
├── lib/calculos/liquidacion.ts (MOTOR v3.1 CORREGIDO)
├── IUSC sobre RLI (Art. 42 N°1 DL 824)
├── Bisección corregida (IUSC sobre RLI, no sobre bruto)
├── Campo apv_regimen, rima, motor_version
├── Tests unitarios: 7 casos obligatorios
├── API /api/calcular-liquidacion
└── UI Simulador público

FASE 3 — CONTRATOS (Sem 3-4)
├── Plantilla HTML unificada con condicionales
├── MultiStepForm (consumible por web Y WhatsApp)
├── Formulario contrato (4 secciones + bifurcaciones)
├── PDF con puppeteer-core + @sparticuz/chromium
├── Storage Supabase
├── Lista + detalle contratos
└── Email con Resend

FASE 4 — LIQUIDACIONES (Sem 4-5)
├── Formulario datos mensuales
├── Cálculo completo motor v3.1 + reforma
├── PDF liquidación + PDF resumen pagos
├── Lista + detalle liquidaciones
├── Envío email
└── Cron recordatorios (día 25 + último día)

FASE 5 — INDICADORES + PERMISOS (Sem 5-6)
├── Edge Function update-indicadores (scraping Previred + SII)
├── Tabla indicadores_actualizacion_log + validación + alertas
├── pg_cron mensual
├── CRUD permisos/ausencias
└── Impacto permisos en liquidaciones

FASE 6 — BILLING + NOTIFICACIONES (Sem 6-7)
├── Integración Stripe/MercadoPago
├── Planes: Free, Pro Mensual, Pro Anual
├── checkPlanAccess implementación real
├── Notificaciones Realtime + email
└── Cartola/vista consolidada

FASE 7 — LANDING + PÚBLICO (Sem 7-8)
├── Landing page completa
├── Simulador contrato público
├── PWA + Analytics + SEO

FASE 8 — WHATSAPP + IA (Sem 8-9)
├── Meta Business API + webhook
├── Flujos conversacionales
├── Claude API para consultas
└── Estado conversacional en Supabase
```

### Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://sdobbpbagffmntjfcmuw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
RESEND_API_KEY=re_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
META_WHATSAPP_TOKEN=...
META_VERIFY_TOKEN=...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://gesti.cl
GOOGLE_SHEETS_SPREADSHEET_ID=... (solo para migración)
GOOGLE_SERVICE_ACCOUNT_KEY=... (solo para migración)
```

---

## RESUMEN V2 → V3.1

| Aspecto | V2 | V3.1 |
|---------|-----|------|
| Base de datos | Google Sheets | Supabase PostgreSQL (11 tablas, RLS) |
| Backend | Google Apps Script | Next.js API Routes + Edge Functions |
| Frontend | React (Vite) | Next.js 14 + Tailwind + shadcn/ui |
| Formularios | Typeform ($$$) | MultiStepForm nativo (web + WhatsApp) |
| Plantillas | Google Docs (8 archivos) | 1 HTML unificado + puppeteer-core |
| Emails | Gmail/Apps Script | Resend transaccional |
| Indicadores | Hardcodeados | Supabase + scraping auto mensual + log |
| **IUSC** | ❌ No existía | ✅ **Sobre RLI** (Art. 42 DL 824) |
| **Base IUSC** | — | **Bruto − AFP − Salud − APV_B** |
| Reforma previsional | ❌ | ✅ 4 cotizaciones + gradualidad + licencias |
| Cesantía trabajador | ⚠️ Se descontaba | ✅ TCP = 0% siempre |
| SIS | 1,78% (viejo) | 1,54% (actualizado) |
| APV | ❌ | ✅ Régimen A/B |
| RIMA licencias | ❌ | ✅ Campo para prorrateo |
| motor_version | ❌ | ✅ "v3.1" en cada liquidación |
| Migración datos | ❌ | ✅ Script Fase 0 |
| Log indicadores | ❌ | ✅ Tabla + alertas + fallback |
| PDF engine | Google Docs→PDF | puppeteer-core en API Routes |
| Plan middleware | ❌ | ✅ checkPlanAccess desde Fase 1 |

---

*Documento definitivo v3.1 — Gesti | Marzo 2026 | gesti.cl*
