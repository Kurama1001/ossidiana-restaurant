const BRONZE = '#b3895e';
const CREAM = '#f9f7f0';
const DARK = '#1a1a1a';

function ObsidianMark({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <polygon points="24,4 44,42 4,42" fill={DARK} />
      <polygon points="24,4 31,42 4,42" fill="#333333" opacity="0.5" />
      <polygon points="24,4 44,42 31,42" fill="#000000" opacity="0.35" />
      <line x1="24" y1="4" x2="24" y2="42" stroke={BRONZE} strokeWidth="1.4" opacity="0.7" />
      <line x1="12" y1="31" x2="36" y2="31" stroke={BRONZE} strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

/**
 * Tessera QR espositiva 9x6 cm (1063x709 px @ 300 DPI) — "Porta QR".
 * Renderizzata a dimensione piena; usata sia per l'anteprima (scalata via CSS)
 * sia per l'export PNG via html2canvas.
 */
export default function QrTableCard({ turno = 'pranzo', qrSrc, onImagesLoaded }) {
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
        backgroundColor: '#0b1723',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Sfondo geometrico */}
      <div style={{ position: 'absolute', top: -120, right: -80, width: 520, height: 520, background: 'linear-gradient(225deg, #1a2736 0%, #1a2736 44%, rgba(26,39,54,0) 44.5%)' }} />
      <div style={{ position: 'absolute', bottom: -140, left: -100, width: 600, height: 600, background: 'linear-gradient(45deg, #131f2c 0%, #131f2c 38%, rgba(19,31,44,0) 38.5%)' }} />
      <div style={{ position: 'absolute', top: 230, right: 260, width: 180, height: 180, background: 'linear-gradient(135deg, rgba(26,39,54,0.5) 0%, rgba(26,39,54,0.5) 40%, rgba(26,39,54,0) 40.5%)' }} />

      {/* Doppio filetto bronzo */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, border: `1px solid ${BRONZE}`, borderRadius: 12, opacity: 0.8 }} />

      {/* Header — logo Ossidiana */}
      <div style={{ position: 'absolute', left: 40, top: 40, backgroundColor: CREAM, borderRadius: 12, padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <ObsidianMark />
        <div>
          <div style={{ fontSize: 30, letterSpacing: 6, color: DARK, fontWeight: 'bold' }}>OSSIDIANA</div>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, letterSpacing: 4, color: BRONZE, marginTop: 2 }}>CUCINA CONTEMPORANEA</div>
        </div>
      </div>

      {/* Pannello sinistro — testo */}
      <div style={{ position: 'absolute', left: 40, top: 148, width: 621, height: 421, backgroundColor: CREAM, borderRadius: 14, padding: '40px 44px' }}>
        <div style={{ fontSize: 60, fontWeight: 'bold', color: DARK, letterSpacing: 2, lineHeight: 1 }}>{title}</div>
        <div style={{ width: 120, height: 2, backgroundColor: BRONZE, margin: '20px 0 16px 0' }} />
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 17, fontWeight: 'bold', letterSpacing: 5, color: DARK }}>INQUADRA • SCEGLI • GUSTA</div>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 16, color: '#666666', marginTop: 14, lineHeight: 1.5 }}>{desc}</div>

        {/* Ornamento — rombo in cornice */}
        <div style={{ position: 'absolute', left: 44, bottom: 30, width: 48, height: 48, border: `1px solid ${BRONZE}`, opacity: 0.8 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 18, height: 18, backgroundColor: BRONZE, transform: 'translate(-50%, -50%) rotate(45deg)' }} />
        </div>
      </div>

      {/* Pannello destro — QR */}
      <div style={{ position: 'absolute', right: 40, top: 148, width: 322, height: 421, backgroundColor: CREAM, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {qrSrc ? (
          <img src={qrSrc} alt={`QR ${title}`} width={230} height={230} style={{ display: 'block' }} onLoad={onImagesLoaded} onError={onImagesLoaded} />
        ) : (
          <div style={{ width: 230, height: 230, backgroundColor: '#eeeeee' }} />
        )}
        <div style={{ width: 150, height: 1, backgroundColor: BRONZE, margin: '18px 0 14px 0' }} />
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 15, fontWeight: 'bold', letterSpacing: 3, color: DARK }}>SCANSIONA IL MENÙ</div>
      </div>

      {/* Footer — sito */}
      <div style={{ position: 'absolute', left: 44, top: 618, fontFamily: 'Arial, sans-serif', fontSize: 15, letterSpacing: 3, color: 'rgba(249,247,240,0.55)' }}>ossidianarestaurant.com</div>
    </div>
  );
}