const BRONZE = '#b08d57';
const NAVY = '#0c141d';
const CREAM = '#f4f2eb';

export const OSSIDIANA_LOGO_URL = 'https://media.base44.com/images/public/6a047f37242becec83398e6f/8db4c84db_Ossidiana_02_Positivo1.png';

/**
 * Tessera QR espositiva 9x6 cm (1063x709 px @ 300 DPI) — "Porta QR".
 * Renderizzata a dimensione piena; usata sia per l'anteprima (scalata via CSS)
 * sia per l'export PNG via html2canvas.
 */
export default function QrTableCard({ turno = 'pranzo', qrSrc, logoSrc = OSSIDIANA_LOGO_URL, onImagesLoaded }) {
  const isLunch = turno === 'pranzo';
  const title = isLunch ? 'MENÙ PRANZO' : 'MENÙ CENA';
  const desc = isLunch
    ? 'Scansiona il QR code per consultare il nostro menù del pranzo.'
    : 'Scansiona il QR code per consultare il nostro menù della cena.';

  return (
    <div
      style={{
        width: 1063,
        height: 709,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        border: `3px solid ${BRONZE}`,
        backgroundColor: NAVY,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Sfondo geometrico low-poly, basso contrasto */}
      <div style={{ position: 'absolute', top: -120, right: -80, width: 520, height: 520, background: 'linear-gradient(225deg, #16222e 0%, #16222e 44%, rgba(22,34,46,0) 44.5%)' }} />
      <div style={{ position: 'absolute', bottom: -140, left: -100, width: 600, height: 600, background: 'linear-gradient(45deg, #131e2a 0%, #131e2a 38%, rgba(19,30,42,0) 38.5%)' }} />
      <div style={{ position: 'absolute', top: 240, right: 300, width: 160, height: 160, background: 'linear-gradient(135deg, rgba(22,34,46,0.45) 0%, rgba(22,34,46,0.45) 40%, rgba(22,34,46,0) 40.5%)' }} />

      {/* Filetto interno */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, border: `1px solid ${BRONZE}`, borderRadius: 12, opacity: 0.9 }} />

      {/* Header — pannello crema con logo Ossidiana */}
      <div style={{ position: 'absolute', left: 44, top: 44, backgroundColor: CREAM, borderRadius: 12, padding: '16px 28px' }}>
        <img src={logoSrc} alt="Ossidiana" height={62} style={{ display: 'block' }} onLoad={onImagesLoaded} onError={onImagesLoaded} />
      </div>

      {/* Colonna sinistra — testo su navy */}
      <div style={{ position: 'absolute', left: 60, top: 200, width: 560 }}>
        <div style={{ fontSize: 58, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2, lineHeight: 1.05 }}>{title}</div>
        <div style={{ width: 120, height: 2, backgroundColor: BRONZE, margin: '20px 0 18px 0' }} />
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 17, fontWeight: 'bold', letterSpacing: 5, color: '#ffffff' }}>INQUADRA • SCEGLI • GUSTA</div>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 14, lineHeight: 1.5 }}>{desc}</div>
      </div>

      {/* Ornamento + sito — bottom left */}
      <div style={{ position: 'absolute', left: 60, bottom: 44 }}>
        <div style={{ width: 42, height: 42, border: `1px solid ${BRONZE}`, position: 'relative', opacity: 0.9 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 16, height: 16, backgroundColor: BRONZE, transform: 'translate(-50%, -50%) rotate(45deg)' }} />
        </div>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 14, letterSpacing: 3, color: 'rgba(255,255,255,0.5)', marginTop: 14 }}>ossidianarestaurant.com</div>
      </div>

      {/* QR — card bianca centrata nella metà destra */}
      <div style={{ position: 'absolute', left: 631, top: 130, width: 330, height: 450, backgroundColor: '#ffffff', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {qrSrc ? (
          <img src={qrSrc} alt={`QR ${title}`} width={256} height={256} style={{ display: 'block' }} onLoad={onImagesLoaded} onError={onImagesLoaded} />
        ) : (
          <div style={{ width: 256, height: 256, backgroundColor: '#eeeeee' }} />
        )}
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 15, fontWeight: 'bold', letterSpacing: 3, color: '#1a1a1a', marginTop: 22 }}>SCANSIONA IL MENÙ</div>
        <div style={{ width: 110, height: 2, backgroundColor: BRONZE, marginTop: 12 }} />
      </div>
    </div>
  );
}