import { PDFDocument } from 'pdf-lib';

const TARGET_DPI = 150;
const JPEG_QUALITY = 0.6;

export async function compressPdf(file: File): Promise<File> {
  // Load pdf.js only in the browser, only when this function actually runs —
  // its top-level code touches browser-only APIs (DOMMatrix) that don't exist
  // during Next.js's server-side build/prerender step.
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const newPdf = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const scale = TARGET_DPI / 72;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const jpegDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const jpegBytes = await fetch(jpegDataUrl).then((r) => r.arrayBuffer());

    const jpegImage = await newPdf.embedJpg(jpegBytes);
    const newPage = newPdf.addPage([viewport.width, viewport.height]);
    newPage.drawImage(jpegImage, { x: 0, y: 0, width: viewport.width, height: viewport.height });
  }

  const compressedBytes = await newPdf.save();
  return new File([compressedBytes as BlobPart], file.name, { type: 'application/pdf' });
}
