/**
 * Motor de renderizado de plantillas HTML — Gesti V3.1
 *
 * Soporta:
 * - {{variable}} — sustitución simple
 * - {{#if var}}...{{/if}} — condicionales
 * - {{#if var}}...{{else}}...{{/if}} — condicionales con else
 * - {{#each array}}...{{/each}} — iteración (usa {{nombre}}, {{tasa}}, etc. dentro)
 * - Formateo automático de números al formato chileno (punto separador miles)
 */

type TemplateVariables = Record<string, unknown>;

/**
 * Formatea un número al estilo chileno: punto como separador de miles, coma decimal.
 * Ej: 1234567 → "1.234.567", 1234.5 → "1.234,5"
 */
function formatNumber(value: number): string {
  const parts = value.toString().split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (parts.length > 1) {
    return `${integerPart},${parts[1]}`;
  }
  return integerPart;
}

/**
 * Resuelve el valor de una variable desde el contexto.
 * Soporta acceso por punto: "cotizacion.nombre"
 */
function resolveValue(key: string, variables: TemplateVariables): unknown {
  const trimmed = key.trim();
  const parts = trimmed.split('.');
  let current: unknown = variables;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Determina si un valor es "truthy" para condicionales de plantilla.
 * false, 0, null, undefined, '' → falsy
 */
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Procesa bloques {{#each array}}...{{/each}}.
 * Dentro del bloque, las variables del item se acceden directamente: {{nombre}}, {{tasa}}.
 * También expone {{@index}} (0-based) y {{@first}} / {{@last}} como booleanos.
 */
function processEachBlocks(html: string, variables: TemplateVariables): string {
  const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return html.replace(eachRegex, (_match, arrayKey: string, blockContent: string) => {
    const arr = resolveValue(arrayKey, variables);

    if (!Array.isArray(arr) || arr.length === 0) {
      return '';
    }

    return arr
      .map((item, index) => {
        const itemVars: TemplateVariables = {
          ...variables,
          '@index': index,
          '@first': index === 0,
          '@last': index === arr.length - 1,
        };

        // Si el item es un objeto, merge sus propiedades al contexto
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(itemVars, item as Record<string, unknown>);
        }

        // Procesar condicionales y variables dentro del bloque del each
        let rendered = processIfBlocks(blockContent, itemVars);
        rendered = replaceVariables(rendered, itemVars);
        return rendered;
      })
      .join('');
  });
}

/**
 * Procesa bloques {{#if var}}...{{/if}} y {{#if var}}...{{else}}...{{/if}}.
 * Soporta bloques anidados.
 */
function processIfBlocks(html: string, variables: TemplateVariables): string {
  // Procesar de adentro hacia afuera para soportar anidamiento
  let result = html;
  let prevResult = '';

  // Iterar hasta que no haya más cambios (maneja anidamiento)
  while (result !== prevResult) {
    prevResult = result;

    // {{#if var}}...{{else}}...{{/if}} (innermost only — no nested {{#if}} inside)
    result = result.replace(
      /\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if\b)(?!\{\{\/if\}\})[\s\S])*?)\{\{else\}\}((?:(?!\{\{#if\b)(?!\{\{\/if\}\})[\s\S])*?)\{\{\/if\}\}/g,
      (_match, key: string, ifBlock: string, elseBlock: string) => {
        const value = resolveValue(key, variables);
        return isTruthy(value) ? ifBlock : elseBlock;
      }
    );

    // {{#if var}}...{{/if}} (sin else, innermost only)
    result = result.replace(
      /\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if\b)(?!\{\{\/if\}\})[\s\S])*?)\{\{\/if\}\}/g,
      (_match, key: string, block: string) => {
        const value = resolveValue(key, variables);
        return isTruthy(value) ? block : '';
      }
    );
  }

  return result;
}

/**
 * Reemplaza {{variable}} con su valor del contexto.
 * Números se formatean automáticamente al estilo chileno.
 */
function replaceVariables(html: string, variables: TemplateVariables): string {
  return html.replace(/\{\{([\w.@]+)\}\}/g, (_match, key: string) => {
    const value = resolveValue(key, variables);

    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return formatNumber(value);
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
  });
}

/**
 * Renderiza una plantilla HTML reemplazando variables y procesando directivas.
 *
 * Orden de procesamiento:
 * 1. {{#each}} — Itera sobre arrays
 * 2. {{#if}} / {{else}} / {{/if}} — Condicionales
 * 3. {{variable}} — Sustitución de variables
 *
 * @param html - Plantilla HTML con marcadores {{}}
 * @param variables - Objeto con las variables a inyectar
 * @returns HTML renderizado listo para generar PDF
 */
export function renderTemplate(
  html: string,
  variables: TemplateVariables
): string {
  let result = html;

  // 1. Procesar bloques {{#each}}
  result = processEachBlocks(result, variables);

  // 2. Procesar bloques {{#if}} / {{else}}
  result = processIfBlocks(result, variables);

  // 3. Reemplazar variables simples
  result = replaceVariables(result, variables);

  return result;
}
