import { useState, useEffect } from 'react';

// Cache module-level: chiave -> url compresso (blob:) o url originale (fallback)
const cache = new Map();

const makeKey = (src, maxDim, quality) => `${src}|${maxDim}|${quality}`;

/**
 * Immagine con compressione automatica lato client (runtime):
 * - ridimensiona a `maxDim` (mantenendo proporzioni) e ri-codifica in JPEG `quality`
 * - mostra skeleton shimmer finché non è pronta
 * - lazy loading + decoding asincrono
 * - fallback all'origine se canvas tainted (CORS) o errore
 * - cache module-level per evitare ri-elaborazione allo stesso src
 */
export default function CompressedImage({
  src,
  alt = '',
  className = '',
  maxDim = 1200,
  quality = 0.8,
  loading = 'lazy',
  onClick,
  style,
}) {
  const [resolved, setResolved] = useState(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!src) { setResolved(null); return; }
    const key = makeKey(src, maxDim, quality);
    const cached = cache.get(key);
    if (cached !== undefined) {
      setResolved(cached);
      setFallback(false);
      return;
    }
    setResolved(null);
    setFallback(false);
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || maxDim, img.naturalHeight || maxDim));
        const w = Math.max(1, Math.round((img.naturalWidth || maxDim) * scale));
        const h = Math.max(1, Math.round((img.naturalHeight || maxDim) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (cancelled) return;
          if (blob && blob.size > 0) {
            const url = URL.createObjectURL(blob);
            cache.set(key, url);
            setResolved(url);
          } else {
            cache.set(key, src);
            setResolved(src);
          }
        }, 'image/jpeg', quality);
      } catch {
        if (cancelled) return;
        cache.set(key, src);
        setResolved(src);
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      cache.set(key, src);
      setResolved(src);
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src, maxDim, quality]);

  if (!src) {
    return <div className={`bg-[#161618] animate-pulse ${className}`} style={style} />;
  }

  if (!resolved) {
    return <div className={`bg-[#161618] animate-pulse ${className}`} style={style} />;
  }

  return (
    <img
      src={fallback ? src : resolved}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      onClick={onClick}
      style={style}
      onError={() => { if (!fallback) { setFallback(true); cache.set(makeKey(src, maxDim, quality), src); } }}
    />
  );
}