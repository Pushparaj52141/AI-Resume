import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

type PdfParseFn = (data: Buffer) => Promise<{ text: string }>;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (fileName.endsWith('.pdf')) {
      const pdfParseMod = await import('pdf-parse');
      const pdfParse = (pdfParseMod as { default?: PdfParseFn }).default ?? (pdfParseMod as unknown as PdfParseFn);
      const parsed = await pdfParse(buffer);
      extractedText = (parsed.text || '').trim();
    } else if (fileName.endsWith('.docx')) {
      const parsed = await mammoth.extractRawText({ buffer });
      extractedText = (parsed.value || '').trim();
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.txt')) {
      extractedText = buffer.toString('utf8').replace(/\u0000/g, ' ').trim();
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error('Import resume parse error:', error);
    return NextResponse.json({ error: 'Failed to parse resume file' }, { status: 500 });
  }
}
