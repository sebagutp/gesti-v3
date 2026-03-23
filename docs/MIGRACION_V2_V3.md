# Migración V2 → V3.1 — Gesti

## Prerequisitos

1. **Node.js 18+** y `npx tsx` disponible
2. **Variables de entorno** configuradas en `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://sdobbpbagffmntjfcmuw.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   ```
3. **Google Sheets** exportadas como CSV público:
   - Hoja de contratos V2
   - Hoja de liquidaciones V2
   - URL formato: `https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>`
4. **Usuarios ya registrados** en V3 — el script vincula datos por email del empleador
5. **Backup de la base de datos** antes de ejecutar (ver sección Rollback)

## Estructura esperada del CSV

### Contratos (columnas requeridas)
| Columna | Descripción |
|---|---|
| `rut_empleador` | RUT empleador (formato 12345678-9) |
| `nombre_empleador` | Nombre completo |
| `email_empleador` | Email |
| `rut_trabajador` | RUT trabajador |
| `nombre_trabajador` | Nombre |
| `apellidos_trabajador` | Apellidos |
| `email_trabajador` | Email trabajador |
| `domicilio_trabajador` | Dirección |
| `tipo_contrato` | "puertas adentro" o "puertas afuera" |
| `tipo_jornada` | "completa"/"full" o "parcial"/"part" |
| `sueldo` | Monto numérico |
| `tipo_sueldo` | "líquido", "imponible" o "bruto" |
| `afp` | Nombre AFP |
| `fecha_inicio` | YYYY-MM-DD |
| `fecha_termino` | YYYY-MM-DD (opcional) |
| `colacion` | Monto numérico |
| `movilizacion` | Monto numérico |
| `user_email` | Email del usuario dueño en V3 |

### Liquidaciones (columnas requeridas)
| Columna | Descripción |
|---|---|
| `rut_trabajador` | RUT trabajador (para vincular contrato) |
| `periodo` | YYYY-MM |
| `sueldo_base` | Monto |
| `dias_trabajados` | Entero |
| `dias_licencia` | Entero |
| `horas_extra` | Entero |
| `anticipo` | Monto |
| `otros_bonos` | Monto |
| `total_haberes` | Monto |
| `total_descuentos` | Monto |
| `liquido` | Monto |
| `user_email` | Email del usuario dueño en V3 |

## Pasos de ejecución

### Paso 1: Dry Run
```bash
npx tsx src/scripts/migrate-v2.ts --dry-run \
  --sheet-contratos "https://docs.google.com/spreadsheets/d/XXXX/export?format=csv&gid=0" \
  --sheet-liquidaciones "https://docs.google.com/spreadsheets/d/XXXX/export?format=csv&gid=123"
```

Revisar el log completo. Verificar:
- Cantidad de filas detectadas
- Filas omitidas y razón (RUT inválido, email no encontrado, etc.)
- Datos mapeados correctamente

### Paso 2: Migración real
```bash
npx tsx src/scripts/migrate-v2.ts \
  --sheet-contratos "URL_CSV_CONTRATOS" \
  --sheet-liquidaciones "URL_CSV_LIQUIDACIONES"
```

### Paso 3: Verificar resumen
El script imprime un resumen al final:
```
Contratos:    Total / Insertados / Omitidos / Errores
Liquidaciones: Total / Insertados / Omitidos / Errores
```

## Verificación post-migración

Ejecutar las siguientes queries SQL en Supabase SQL Editor:

### Conteo de registros migrados
```sql
-- Contratos migrados (estado 'activo' insertados hoy)
SELECT COUNT(*) AS contratos_migrados
FROM contratos
WHERE estado = 'activo'
  AND created_at::date = CURRENT_DATE;

-- Liquidaciones migradas (motor_version v2-migrated)
SELECT COUNT(*) AS liquidaciones_migradas
FROM liquidaciones
WHERE calculo->>'meta'->>'motor_version' = 'v2-migrated';
```

### Integridad referencial
```sql
-- Liquidaciones sin contrato válido (debe ser 0)
SELECT COUNT(*) AS huerfanas
FROM liquidaciones l
LEFT JOIN contratos c ON c.id = l.contrato_id
WHERE c.id IS NULL;

-- Contratos sin user_profile válido (debe ser 0)
SELECT COUNT(*) AS sin_usuario
FROM contratos c
LEFT JOIN user_profiles u ON u.id = c.user_id
WHERE u.id IS NULL;
```

### Validación de datos
```sql
-- Contratos con sueldo sospechoso (fuera de rango)
SELECT id, nombre_trabajador, sueldo_base
FROM contratos
WHERE sueldo_base < 100000 OR sueldo_base > 5000000;

-- Liquidaciones con líquido negativo
SELECT id, periodo, calculo->'totales'->>'liquido' AS liquido
FROM liquidaciones
WHERE (calculo->'totales'->>'liquido')::numeric < 0;

-- RUTs duplicados por usuario
SELECT user_id, numero_documento, COUNT(*) AS cantidad
FROM contratos
WHERE vigente = true
GROUP BY user_id, numero_documento
HAVING COUNT(*) > 1;
```

### Consistencia de periodos
```sql
-- Liquidaciones con periodo fuera de rango del contrato
SELECT l.id, l.periodo, c.fecha_inicio, c.fecha_termino
FROM liquidaciones l
JOIN contratos c ON c.id = l.contrato_id
WHERE l.periodo < TO_CHAR(c.fecha_inicio, 'YYYY-MM')
   OR (c.fecha_termino IS NOT NULL AND l.periodo > TO_CHAR(c.fecha_termino, 'YYYY-MM'));
```

## Rollback

### Opción A: Restaurar backup completo
Si se tomó un backup con `pg_dump` antes de migrar:
```bash
psql $DATABASE_URL < backup_pre_migration.sql
```

### Opción B: Eliminar solo datos migrados
```sql
-- Eliminar liquidaciones migradas (por motor_version)
DELETE FROM liquidaciones
WHERE (calculo->'meta'->>'motor_version') = 'v2-migrated';

-- Eliminar contratos migrados (por fecha de creación)
DELETE FROM contratos
WHERE estado = 'activo'
  AND created_at::date = 'YYYY-MM-DD';  -- Fecha de migración
```

### Opción C: Point-in-time recovery
Supabase Pro permite restaurar a un punto específico:
1. Dashboard → Database → Backups → Point in Time Recovery
2. Seleccionar timestamp anterior a la migración

## Notas

- Las liquidaciones migradas usan `motor_version: "v2-migrated"` para distinguirlas de las generadas en V3.1
- Los datos de cotizaciones empleador no se migran (no existían en V2), quedan en 0
- Si un contrato o liquidación ya existe (mismo user_id + RUT + fecha_inicio), se hace upsert
- El script requiere que los usuarios ya estén registrados en V3 por su email
