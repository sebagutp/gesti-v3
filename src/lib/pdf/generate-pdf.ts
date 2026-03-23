/**
 * Generador de PDF — Gesti V3.1
 *
 * Usa puppeteer-core + @sparticuz/chromium para renderizar HTML a PDF.
 * Solo para uso en API Routes de Next.js (NO Edge Functions).
 *
 * Timeout: 30s | Viewport: 1200×1400 | headless: true
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Genera un Buffer PDF a partir de HTML renderizado.
 *
 * @param html - HTML completo (ya procesado por renderTemplate)
 * @returns Buffer con el contenido del PDF
 * @throws Error si el proceso excede 30s o falla el renderizado
 */
export async function generatePDF(html: string): Promise<Buffer> {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 1400 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
