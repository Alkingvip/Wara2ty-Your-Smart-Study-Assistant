/**
 * Smart client-side image optimizer for OCR & Computer Vision.
 * Resizes ultra-high-resolution camera images to an optimal max dimension (2048px)
 * and compresses them to prevent server memory exhaustion and 413/503 payload timeouts
 * while preserving crisp handwriting and printed text legibility.
 */

export interface OptimizedImageResult {
  dataUrl: string;
  mimeType: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  width: number;
  height: number;
  wasCompressed: boolean;
}

const MAX_OCR_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export async function optimizeImageForAnalysis(file: File): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('تعذر قراءة ملف الصورة من الجهاز.'));
    };

    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      if (!rawDataUrl) {
        reject(new Error('محتوى ملف الصورة فارغ أو غير صالح.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let targetWidth = img.naturalWidth || img.width;
          let targetHeight = img.naturalHeight || img.height;

          const needsResize =
            targetWidth > MAX_OCR_DIMENSION || targetHeight > MAX_OCR_DIMENSION;
          const isLargeFile = file.size > 1.2 * 1024 * 1024; // > 1.2 MB

          // If the image is already small and within optimal dimensions, return as-is
          if (!needsResize && !isLargeFile) {
            resolve({
              dataUrl: rawDataUrl,
              mimeType: file.type || 'image/jpeg',
              originalSizeBytes: file.size,
              optimizedSizeBytes: file.size,
              width: targetWidth,
              height: targetHeight,
              wasCompressed: false,
            });
            return;
          }

          if (needsResize) {
            if (targetWidth >= targetHeight) {
              targetHeight = Math.round((targetHeight * MAX_OCR_DIMENSION) / targetWidth);
              targetWidth = MAX_OCR_DIMENSION;
            } else {
              targetWidth = Math.round((targetWidth * MAX_OCR_DIMENSION) / targetHeight);
              targetHeight = MAX_OCR_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: rawDataUrl,
              mimeType: file.type || 'image/jpeg',
              originalSizeBytes: file.size,
              optimizedSizeBytes: file.size,
              width: targetWidth,
              height: targetHeight,
              wasCompressed: false,
            });
            return;
          }

          // Fill white background in case of transparent PNGs so handwritten dark ink has high contrast
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const outputMime = 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outputMime, JPEG_QUALITY);

          // Estimate byte size from base64 length
          const base64Part = compressedDataUrl.split(',')[1] || '';
          const estimatedBytes = Math.round((base64Part.length * 3) / 4);

          // If compression somehow made a tiny file larger, keep original
          if (!needsResize && estimatedBytes >= file.size) {
            resolve({
              dataUrl: rawDataUrl,
              mimeType: file.type || 'image/jpeg',
              originalSizeBytes: file.size,
              optimizedSizeBytes: file.size,
              width: img.naturalWidth,
              height: img.naturalHeight,
              wasCompressed: false,
            });
            return;
          }

          resolve({
            dataUrl: compressedDataUrl,
            mimeType: outputMime,
            originalSizeBytes: file.size,
            optimizedSizeBytes: estimatedBytes,
            width: targetWidth,
            height: targetHeight,
            wasCompressed: true,
          });
        } catch (err) {
          // Fallback to original image if canvas fails
          resolve({
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg',
            originalSizeBytes: file.size,
            optimizedSizeBytes: file.size,
            width: img.naturalWidth || 0,
            height: img.naturalHeight || 0,
            wasCompressed: false,
          });
        }
      };

      img.onerror = () => {
        reject(new Error('الملف المرفوع ليس صورة صالحة أو أنه تالف.'));
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

export function formatBytesArabic(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} كيلوبايت`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} ميغابايت`;
}
