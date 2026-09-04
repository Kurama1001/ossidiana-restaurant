import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import QrTableCard, { OSSIDIANA_LOGO_URL } from '@/components/admin/QrTableCard';

async function toBlobUrl(url) {
  try {
    const blob = await (await fetch(url)).blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Esporta la tessera QR 9x6 cm come PNG a 300 DPI (1063x709 px).
 * QR e logo vengono scaricati come blob same-origin per html2canvas.
 */
export async function downloadQrTableCard(turno, qrUrl) {
  const [qrBlobUrl, logoBlobUrl] = await Promise.all([
    toBlobUrl(qrUrl),
    toBlobUrl(OSSIDIANA_LOGO_URL),
  ]);

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-99999px;top:0;width:1063px;height:709px;pointer-events:none;';
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    // Attende il caricamento di QR e logo prima della cattura
    await new Promise((resolve) => {
      let loaded = 0;
      const onImg = () => { loaded += 1; if (loaded >= 2) resolve(); };
      root.render(
        <QrTableCard
          turno={turno}
          qrSrc={qrBlobUrl || qrUrl}
          logoSrc={logoBlobUrl || OSSIDIANA_LOGO_URL}
          onImagesLoaded={onImg}
        />
      );
      // sicurezza: non bloccare mai del tutto
      setTimeout(resolve, 5000);
    });
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
    if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl);
    if (logoBlobUrl) URL.revokeObjectURL(logoBlobUrl);
  }
}