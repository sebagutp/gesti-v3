# context/calculos.md — Motor de Cálculo v3.1

## Archivo principal: `lib/calculos/liquidacion.ts`

## Marco Legal y Restricciones

### Artículo 42 N°1 DL 824 — Impuesto Único sobre la Renta (IUSC)
- Aplicable ÚNICAMENTE sobre Renta Líquida Imponible (RLI)
- NUNCA se calcula sobre sueldo bruto
- RLI = Sueldo Imponible - AFP - Salud - APV Régimen B

### Ley 21.735 — Reforma Previsional
Introducción de 4 nuevas cotizaciones para empleador con gradualidad:
1. **Capitalización Individual AFP:** 0,1% (2026) → 0,3% (2027) → 0,5% (2029) → 4,5% (2033)
2. **Expectativa de Vida:** 0,9% (activación 08/2026) → 1,0%
3. **Rentabilidad Protegida:** 0% (2026) → 0,9% (08/2026)
4. **Seguro de Invalidez y Sobrevivencia (SIS):** 1,54% (base trabajador)

### TCP Particularidades
- **Cesantía Trabajador:** 0% SIEMPRE
- **Cesantía Empleador:** 3% (sobre sueldo imponible)
- **Sueldo Mínimo Marzo 2026:** $539.000

---

## Orden de Cálculo (11 Pasos)

1. **Obtener tasa AFP trabajador** — Según AFP seleccionada (Capital, Cuprum, etc.)
2. **Calcular/resolver sueldo base imponible** — Bisección si tipo_sueldo = 'líquido' y requiere impuesto
3. **Ajustar por inasistencias y horas extra** — Reducir por faltas, aumentar por sobretiempo
4. **AFP del trabajador** — `bruto × tasaAFP` (tope 90 UF = $3.585.755)
5. **Salud del trabajador** — `bruto × 0.07` (fijo 7%)
6. **APV Régimen B** — Reduce RLI hasta 50 UF/mes ($1.992.086)
7. **Calcular RLI** — `RLI = bruto_ajustado − AFP − Salud − APV_B`
8. **Calcular IUSC** — Usando tabla de tramos, ÚNICAMENTE sobre RLI
9. **Calcular sueldo líquido** — `bruto − AFP − Salud − IUSC − APV_B`
10. **Asignación familiar** — 4 tramos según número cargas (hijos)
11. **Cotizaciones empleador** — SIS, ISL, Indemnización, Cesantía (3%), 4 reforma + SANNA

---

## Bisección: resolverBrutoDesdeNeto

Cuando `tipo_sueldo = 'liquido'` y debe pagarse IUSC, resolver bruto mediante iteración binaria.

```pseudocode
function resolverBrutoDesdeNeto(neto_deseado, tasaAFP, rima_anterior = null) {
  bajo = sueldo_minimo_tcp
  alto = neto_deseado × 2  // cota superior
  tolerancia = 1  // CLP

  while (alto - bajo > tolerancia) {
    mid = (bajo + alto) / 2

    afp = mid × tasaAFP
    salud = mid × 0.07
    rli = mid − afp − salud
    iusc = calcularIUSC(rli)

    neto_resultante = mid − afp − salud − iusc

    if (neto_resultante < neto_deseado) {
      bajo = mid
    } else {
      alto = mid
    }
  }

  return alto
}
```

**Punto crítico:** IUSC se calcula sobre `(mid - AFP(mid) - Salud(mid))`, no sobre `mid`.

---

## Tabla IUSC Marzo 2026 (sobre RLI)

| Tramo | RLI hasta | Factor | Rebaja |
|-------|-----------|--------|--------|
| 1 | $943.501 | Exento | — |
| 2 | $2.096.670 | 0,04 | $37.740 |
| 3 | $3.494.450 | 0,08 | $121.607 |
| 4 | $5.230.180 | 0,135 | $380.520 |
| 5 | $7.464.530 | 0,23 | $1.106.970 |
| 6 | $9.927.240 | 0,304 | $1.769.340 |
| 7+ | ∞ | 0,37 | $2.684.460 |

**Fórmula:** `IUSC = máx(0, RLI × factor − rebaja)`

---

## APV (Ahorro Previsional Voluntario)

### Régimen A
- Descuento por el trabajador ANTES de calcular RLI
- NO reduce RLI (no afecta IUSC)
- Típicamente 5% del bruto

### Régimen B
- Descuento por el trabajador ANTES de calcular RLI
- SÍ reduce RLI (afecta IUSC)
- Máximo 50 UF/mes = $1.992.086 (2026)

---

## Asignación Familiar (4 Tramos)

Aplica a trabajadores TCP con cargas familiares (hijos).

| Tramo | Cargas (N) | Monto por carga |
|-------|-----------|-----------------|
| 1 | 1 a 2 | UF × 0,25 |
| 2 | 3 a 4 | UF × 0,20 |
| 3 | 5 a 6 | UF × 0,15 |
| 4 | 7+ | UF × 0,10 |

Marzo 2026: 1 UF = $39.841,72

---

## Reforma Previsional — Cotizaciones Empleador Nuevas

### Capitalización Individual AFP
- 2026: 0,1%
- 2027: 0,3%
- 2029: 0,5%
- 2033: 4,5%

### Expectativa de Vida
- Pre-08/2026: 0,9%
- Desde 08/2026: 1,0%

### Rentabilidad Protegida
- Pre-08/2026: 0% (no aplica)
- Desde 08/2026: 0,9%

### Exenciones
Pensionados y mayores 65 años están exentos de estas nuevas cotizaciones.

---

## RIMA (Renta Imponible Mes Anterior)

Requerido cuando hay licencia médica parcial (menos de 30 días).

**Prorrateo de cotizaciones:**
```
cotizacion_trabajado = cotiz_tasa × (días_trabajados / 30)
cotizacion_licencia = cotiz_tasa × (RIMA / 30 × días_licencia)
cotizacion_total = cotizacion_trabajado + cotizacion_licencia
```

---

## Licencia Médica Parcial

Cuando `dias_licencia_medica < 30`:
1. Requiere `RIMA` (monto del mes anterior)
2. Prorratear todas las cotizaciones (empleador y trabajador)
3. El trabajador cobra por días licencia calculados sobre RIMA/30

---

## Motor Version y Auditoría

Cada `Liquidacion` guarda el campo `motor_version = "v3.1"` para auditoría.
Permite auditar cambios de motor en versiones futuras sin perder historial.

---

## Casos de Prueba (AFP Uno, Marzo 2026)

**Parámetros:**
- AFP: Uno (10,45% + 1,47% seguro)
- Salud: 7%
- RLI exento: ≤ $943.501
- Sin dependientes, sin APV, sin licencia

| Líquido pactado | Bruto calculado | AFP | Salud | RLI | IUSC | Líquido resultante |
|-----------------|-----------------|-----|-------|-----|------|-------------------|
| $500.000 | $605.767 | $63.363 | $42.404 | $500.000 | $0 | $500.000 |
| $1.000.000 | $1.211.533 | $126.726 | $84.807 | $1.000.000 | $2.260 | $997.740 |
| $1.500.000 | $1.817.301 | $190.090 | $127.211 | $1.500.000 | $22.260 | $1.477.740 |

---

## Variables de Entrada (InputLiquidacion)

```typescript
interface InputLiquidacion {
  sueldo_base: number
  tipo_sueldo: 'liquido' | 'imponible' | 'bruto'
  afp: string
  es_pensionado: boolean
  dias_trabajados: number
  dias_licencia_medica?: number
  rima?: number  // Obligatorio si dias_licencia_medica < 30
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
```

---

## Archivo de Indicadores

La tabla `indicadores_previsionales` en Supabase contiene:
- UF, UTM, Sueldo Mínimo
- Tasas AFP (Capital, Cuprum, Habitat, etc.)
- Tramos IUSC
- Topes (AFP, Cesantía)
- Tasas Reforma Previsional

Se actualiza mensualmente. Cada liquidación registra `indicadores_usados` para auditoría.
