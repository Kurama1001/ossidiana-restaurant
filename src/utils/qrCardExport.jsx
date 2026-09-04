import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import QrTableCard from '@/components/admin/QrTableCard';

/**
 * Esporta la tessera QR 9x6 cm come PNG a 300 DPI (1063x709 px).
 * Il QR viene scaricato come blob per evitare problemi CORS in html2canvas.
 */
export async function downloadQrTableCard(turno, qrUrl) {
  // QR come blob same-origin per html2canvas
  let qrSrc = qrUrl;
  let blobUrl = null;
  try {
    const blob = await (await fetch(qrUrl)).blob();
    blobUrl = URL.createObjectURL(blob);
    qrSrc = blobUrl;
  } catch {
    // fallback: usa l'URL remoto direttamente
  }

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-99999px;top:0;width:1063px;height:709px;pointer-events:none;';
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await new Promise((resolve) => {
      root.render(<QrTableCard turno={turno} qrSrc={qrSrc} onImagesLoaded={resolve} />);
    });
    // piccolo margine per il paint del font
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(container.firstElementChild, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      width: 1063,
      height: 709,
    });

    const link = document.createElement('a');
    link.download = `Porta_QR_Menu_${turno === 'pranzo' ? 'Pranzo' : 'Cena'}_Ossidiana_9x6cm.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    root.unmount();
    container.remove();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}