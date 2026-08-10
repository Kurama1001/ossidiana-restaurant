/**
 * Comprime e ridimensiona un'immagine lato client prima dell'upload.
 * - Resize mantenendo le proporzioni (max dimension configurable).
 * - Conversione in WebP qualità 0.82 (formato moderno, file molto più leggeri di JPEG/PNG).
 * - I video e i file non-immagine passano through invariati.
 *
 * Uso:
 *   const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });
 *   const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
 */
export async function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  // Solo immagini
  if (!file.type || !file.type.startsWith('image/')) return file;

  // GIF animate: lascia invariate (la compressione rompe l'animazione)
  if (file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // Se già più piccola del max, salta il resize (comprimi comunque qualità)
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    bitmap.close?.();

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });

    if (!blob) return file;

    // Salta se il compresso è più grande dell'originale
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.(png|webp|jpg|jpeg|tif|tiff|bmp|heic|heif)$/i, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
  } catch (e) {
    // Fallback: usa il file originale
    return file;
  }
}

/**
 * Comprime un batch di file (utile per upload multiplo).
 */
export async function compressImages(files, opts) {
  return Promise.all(files.map((f) => compressImage(f, opts)));
}