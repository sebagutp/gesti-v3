# skills/liquidacion-chile.md — Skill: Cálculo Liquidaciones TCP Chile

## Cuándo usar
Cualquier tarea que involucre cálculo de sueldo, cotizaciones previsionales, impuesto a la renta, o indicadores previsionales para Trabajadores de Casa Particular en Chile.

## Reglas obligatorias
1. El IUSC se calcula sobre la RLI (Renta Líquida Imponible = Bruto − AFP − Salud − APV_B), NUNCA sobre el sueldo bruto.
2. La cesantía del trabajador TCP es SIEMPRE 0%. El 3% es 100% cargo del empleador.
3. Las tasas AFP NO incluyen la cotización adicional del empleador (0,1%). Son 2 conceptos separados.
4. El tope imponible AFP es 90 UF (varía mensualmente con la UF).
5. El tope de cesantía es 135,2 UF.
6. La asignación familiar NO es imponible y se calcula por tramos de renta imponible.
7. Al resolver bruto desde líquido con bisección, el IUSC dentro del loop se calcula sobre (mid − AFP(mid) − Salud(mid)).
8. Reforma Previsional: verificar exenciones (pensionados, >65 años) antes de calcular nuevas cotizaciones.
9. Indicadores cambian mensualmente. SIEMPRE leer de tabla `indicadores_previsionales`, no hardcodear.
10. Cada liquidación lleva `motor_version: "v3.1"`.

## Fuentes de verdad
- SII: sii.cl/valores_y_fechas/impuesto_2da_categoria/
- Previred: previred.com/web/previred/indicadores-previsionales
- Art. 42 N°1 DL 824 (base IUSC)
- Ley 21.735 (reforma previsional)

## Validación
Siempre verificar resultados contra los 7 casos de prueba en `docs/context/calculos.md`.

---

# skills/template-rendering.md — Skill: Renderizado de Templates HTML→PDF

## Cuándo usar
Generación de contratos de trabajo, liquidaciones de sueldo, o resúmenes de pagos en PDF.

## Stack
- puppeteer-core + @sparticuz/chromium
- En Next.js API Routes (NO Edge Functions, NO lambda)
- HTML templates con `{{variable}}` y `{{#if condicion}}...{{/if}}`

## Reglas
1. NUNCA usar html-pdf-node, @react-pdf/renderer, o puppeteer completo.
2. Los templates están en `src/templates/`.
3. `renderTemplate()` reemplaza variables y procesa condicionales.
4. El PDF se sube a Supabase Storage bucket `documentos`.
5. La URL pública se guarda en el registro de la tabla correspondiente.
6. Formato papel: Letter. Print background: true.

## Variables de contrato
Condicionales: es_rut, es_pasaporte, es_puertas_adentro, es_full_time
Ver `docs/context/pdf.md` para lista completa.

---

# skills/previred-scraping.md — Skill: Scraping Indicadores Previred

## Cuándo usar
Actualización mensual de indicadores previsionales (UF, UTM, tasas AFP, topes, etc).

## Proceso
1. Fetch `https://www.previred.com/web/previred/indicadores-previsionales`
2. Parsear con cheerio
3. Validar rangos: UF 30k-50k, AFP 10%-13%, UTM 50k-90k
4. Fetch tabla SII impuesto 2da categoría del mes
5. Upsert en `indicadores_previsionales`
6. Log en `indicadores_actualizacion_log`
7. Si fallo → usar datos del mes anterior → alertar admin

## Reglas
1. SIEMPRE validar rangos antes de insertar.
2. SIEMPRE loguear resultado (ok o fallido) con valores parseados.
3. La tabla de impuesto SII cambia con la UTM mensualmente.
4. Incluir tasas de reforma previsional según gradualidad (tabla en system_config).

---

# skills/supabase-rls.md — Skill: Supabase Row Level Security para Gesti

## Patrón
Todas las tablas de usuario usan: `auth.uid() = user_id`
Los datos del usuario solo son visibles para ese usuario.

## Reglas
1. NUNCA exponer service_role_key en el frontend.
2. En API Routes server-side, usar createServerClient con cookies.
3. Para operaciones admin (cron, webhooks), usar service_role_key.
4. El trigger `handle_new_user` crea automáticamente el perfil.
5. Storage: usuarios suben a `{user_id}/` en bucket `documentos`.

---

# skills/multisite-form.md — Skill: Formularios Multi-Step (Typeform-like)

## Componente: MultiStepForm
Recibe un array de FormStep[], renderiza 1 pregunta por pantalla.

## Reglas de diseño
1. Transiciones verticales con Framer Motion.
2. Enter avanza al siguiente paso. Validación en tiempo real con Zod.
3. Barra de progreso superior.
4. Bifurcaciones via `showIf: (answers) => boolean`.
5. El array de steps DEBE poder ser consumido por un runner secuencial genérico (para WhatsApp).
6. Guardado parcial en localStorage (para recuperar sesión).

## Tipos de campo soportados
text, email, number, date, select, multiselect, radio, textarea, rut (validación especial)
