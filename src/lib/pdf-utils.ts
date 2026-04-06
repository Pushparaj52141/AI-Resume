import puppeteer, { type Browser } from 'puppeteer';
import { getResumeSheetPixelSize } from '@/lib/resume-layout-utils';

export interface PDFOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  margin?: { top: string; right: string; bottom: string; left: string };
}

/** One Chromium per Node process — avoids ~3–8s launch on every export (Next dev, API routes, pdf worker). */
const globalForPdf = globalThis as typeof globalThis & {
  __resumePdfBrowser?: Browser;
};

const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
];

async function getSharedBrowser(): Promise<Browser> {
  const g = globalForPdf;
  const existing = g.__resumePdfBrowser;
  if (existing?.isConnected()) {
    return existing;
  }
  if (existing) {
    try {
      await existing.close();
    } catch {
      /* ignore */
    }
    g.__resumePdfBrowser = undefined;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: CHROME_ARGS,
  });

  g.__resumePdfBrowser = browser;
  browser.on('disconnected', () => {
    g.__resumePdfBrowser = undefined;
  });

  return browser;
}

// Faster exports: don't block too long waiting for fonts.
// If fonts are still loading, Puppeteer will continue after this timeout.
const FONTS_READY_MS = Number(process.env.PDF_FONTS_READY_MS ?? 2000);

export async function generatePDF(html: string, options?: PDFOptions) {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  const { width: pw, height: ph } = getResumeSheetPixelSize(options?.format);

  try {
    await page.setViewport({
      width: pw,
      height: ph,
      deviceScaleFactor: 1,
    });

    // `domcontentloaded` is usually faster than `load` because it doesn't wait for all subresources.
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.addStyleTag({
      content: `
        @page {
          size: ${pw}px ${ph}px;
          margin: 0;
        }
        * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: ${pw}px !important;
          background: white !important;
          overflow: visible !important;
          display: block !important;
        }
        #resume-preview {
          width: ${pw}px !important;
          max-width: ${pw}px !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          transform: none !important;
          display: block !important;
        }
        .resume-page-clip {
          margin: 0 !important;
          width: ${pw}px !important;
          height: ${ph}px !important;
          max-width: ${pw}px !important;
          overflow: visible !important;
          background: transparent !important;
          flex-shrink: 0 !important;
        }
        .resume-page {
          margin: 0 !important;
          padding-top: var(--resume-margin-tb) !important;
          padding-bottom: calc(var(--resume-margin-tb) + 20px + 10px) !important;
          padding-left: var(--resume-margin-lr) !important;
          padding-right: var(--resume-margin-lr) !important;
          box-shadow: none !important;
          width: ${pw}px !important;
          height: ${ph}px !important;
          min-height: ${ph}px !important;
          max-height: ${ph}px !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
          break-after: page !important;
          transform: none !important;
          overflow: hidden !important;
          background: white !important;
          box-sizing: border-box !important;
        }
      `,
    });

    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise<void>((resolve) => {
        setTimeout(resolve, FONTS_READY_MS);
      }),
    ]);

    const pdfBuffer = await page.pdf({
      width: `${pw}px`,
      height: `${ph}px`,
      scale: 1,
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '0px',
        bottom: '0px',
        left: '0px',
        right: '0px',
      },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close().catch(() => {});
  }
}
