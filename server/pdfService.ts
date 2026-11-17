import { PDFParse } from 'pdf-parse';

export interface ExtractedPdf {
  text: string;
  pageCount: number;
  info?: any;
  chunks: string[];
  isScanned: boolean;
}

/**
 * Splits text into logical chunks of roughly maxChunkChars
 * with overlap to preserve context across boundaries.
 */
export function chunkText(text: string, maxChunkChars: number = 8000, overlapChars: number = 800): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((currentChunk.length + trimmed.length) > maxChunkChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // preserve overlap from the end of the last chunk
      const overlapStart = Math.max(0, currentChunk.length - overlapChars);
      currentChunk = currentChunk.substring(overlapStart) + '\n\n' + trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractedPdf> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();

    const rawText = textResult.text || '';
    const cleanText = rawText.replace(/\r\n/g, '\n').trim();
    const pageCount = textResult.total || 1;

    // Check if the document appears to be scanned (has pages but minimal characters)
    const isScanned = cleanText.length < 50 && pageCount > 0;

    const chunks = isScanned ? [] : chunkText(cleanText, 7000, 700);

    return {
      text: cleanText,
      pageCount,
      chunks,
      isScanned,
    };
  } catch (error: any) {
    console.error('Error parsing PDF buffer:', error);
    throw new Error(`Failed to parse PDF document: ${error.message || 'Unknown error'}`);
  } finally {
    if (parser && typeof (parser as any).destroy === 'function') {
      try {
        await (parser as any).destroy();
      } catch {
        // ignore destroy error
      }
    }
  }
}
