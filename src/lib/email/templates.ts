/**
 * Templates HTML para emails transaccionales — Gesti V3.1
 *
 * 3 templates: ContratoCreadoTemplate, LiquidacionGeneradaTemplate, RecordatorioMensualTemplate
 * Usan la misma sintaxis {{variable}} y {{#if}}/{{#each}} que el motor de plantillas PDF.
 */

const EMAIL_WRAPPER_START = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #2f2e40;
      background: #f4f4f9;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
    }
    .email-header {
      background: #135e5f;
      padding: 24px 32px;
      text-align: center;
    }
    .email-header img { height: 40px; }
    .email-body {
      padding: 32px;
    }
    .email-body h2 {
      font-size: 20px;
      font-weight: 700;
      color: #135e5f;
      margin: 0 0 16px 0;
    }
    .email-body p {
      margin: 0 0 12px 0;
    }
    .btn {
      display: inline-block;
      background: #6fc8a0;
      color: #fff;
      padding: 12px 28px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      margin: 16px 0;
    }
    .btn-secondary {
      background: #135e5f;
    }
    .resumen-tabla {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .resumen-tabla td {
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
    }
    .resumen-tabla td:first-child {
      color: #888;
      font-size: 14px;
    }
    .resumen-tabla td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .resumen-tabla tr.liquido td {
      border-top: 2px solid #135e5f;
      border-bottom: none;
      color: #135e5f;
      font-size: 18px;
      font-weight: 700;
      padding-top: 12px;
    }
    .contratos-lista {
      margin: 12px 0;
      padding: 0 0 0 20px;
    }
    .contratos-lista li {
      margin-bottom: 6px;
    }
    .email-footer {
      background: #f4f4f9;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    .email-footer a {
      color: #135e5f;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <img src="https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png" alt="Gesti">
    </div>
    <div class="email-body">
`;

const EMAIL_WRAPPER_END = `
    </div>
    <div class="email-footer">
      <p>Gesti V3.1 — Gestión laboral para Trabajadores de Casa Particular</p>
      <p><a href="{{url_portal}}">gesti.cl</a></p>
      <p style="margin-top: 8px; font-size: 11px;">
        Si no deseas recibir estos correos, puedes <a href="{{url_portal}}/perfil/notificaciones">ajustar tus preferencias</a>.
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template: Contrato creado exitosamente
 *
 * Variables: trabajador_nombre, empleador_nombre, link_contrato, fecha_hoy
 */
export const CONTRATO_CREADO_TEMPLATE = `${EMAIL_WRAPPER_START}
      <h2>Contrato creado exitosamente</h2>

      <p>Hola <strong>{{trabajador_nombre}}</strong>,</p>

      <p>Se ha generado tu contrato de trabajo con <strong>{{empleador_nombre}}</strong> el día {{fecha_hoy}}.</p>

      <p>Puedes revisar los detalles y descargar el documento completo desde tu portal:</p>

      <a href="{{link_contrato}}" class="btn">Ver Contrato</a>

      <p>Para aceptar el contrato, ingresa a tu portal con tu email registrado.</p>

      <p style="color: #888; font-size: 13px; margin-top: 20px;">
        Si tienes dudas sobre el contenido del contrato, comunícate directamente con tu empleador/a.
      </p>
${EMAIL_WRAPPER_END}`;

/**
 * Template: Liquidación generada
 *
 * Variables: trabajador_nombre, periodo, bruto, descuentos, liquido,
 *            link_pdf_liquidacion, link_pdf_resumen
 */
export const LIQUIDACION_GENERADA_TEMPLATE = `${EMAIL_WRAPPER_START}
      <h2>Liquidación de Sueldo — {{periodo}}</h2>

      <p>Hola <strong>{{trabajador_nombre}}</strong>,</p>

      <p>Tu liquidación de sueldo del período <strong>{{periodo}}</strong> ya está disponible.</p>

      <table class="resumen-tabla">
        <tr>
          <td>Sueldo bruto</td>
          <td>\${{bruto}}</td>
        </tr>
        <tr>
          <td>Descuentos</td>
          <td>\${{descuentos}}</td>
        </tr>
        <tr class="liquido">
          <td>Sueldo líquido</td>
          <td>\${{liquido}}</td>
        </tr>
      </table>

      <a href="{{link_pdf_liquidacion}}" class="btn">Descargar Liquidación</a>
      <a href="{{link_pdf_resumen}}" class="btn btn-secondary">Descargar Resumen de Pagos</a>

      <p style="color: #888; font-size: 13px; margin-top: 20px;">
        Los documentos PDF también están disponibles en tu portal.
      </p>
${EMAIL_WRAPPER_END}`;

/**
 * Template: Recordatorio mensual de generación de liquidaciones
 *
 * Variables: usuario_nombre, mes, contratos (array con nombre_trabajador),
 *            url_nueva_liquidacion
 */
export const RECORDATORIO_MENSUAL_TEMPLATE = `${EMAIL_WRAPPER_START}
      <h2>Recordatorio: Generar Liquidaciones de {{mes}}</h2>

      <p>Hola <strong>{{usuario_nombre}}</strong>,</p>

      <p>Es momento de generar las liquidaciones de sueldo del mes de <strong>{{mes}}</strong> para tus trabajadores/as.</p>

      <p><strong>Contratos activos pendientes:</strong></p>
      <ul class="contratos-lista">
        {{#each contratos}}
        <li>{{nombre_trabajador}}</li>
        {{/each}}
      </ul>

      <a href="{{url_nueva_liquidacion}}" class="btn">Ir a Generar Liquidaciones</a>

      <p style="color: #888; font-size: 13px; margin-top: 20px;">
        Recuerda que las liquidaciones deben generarse antes del día 5 del mes siguiente.
        Si necesitas ayuda, contáctanos a soporte@gesti.cl.
      </p>
${EMAIL_WRAPPER_END}`;
