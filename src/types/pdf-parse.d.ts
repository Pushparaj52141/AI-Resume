/**
 * pdf-parse ships without TypeScript types. @types/pdf-parse may be missing in some
 * CI/production installs; this ambient declaration satisfies strict typechecking.
 */
declare module 'pdf-parse' {
  interface PdfParseResult {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  type PdfParseFn = (data: Buffer, options?: unknown) => Promise<PdfParseResult>;

  const pdfParse: PdfParseFn;
  export = pdfParse;
}
