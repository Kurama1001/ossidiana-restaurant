// Tessera QR espositiva 9x6 cm (1063x709 px @ 300 DPI) generata come SVG puro:
// posizioni assolute e deterministiche, nessun rendering browser ambiguo.

const BRONZE = '#b08d57';
const NAVY = '#0c141d';
const CREAM = '#f2efe9';

export const OSSIDIANA_LOGO_URL = 'https://media.base44.com/images/public/6a047f37242becec83398e6f/8db4c84db_Ossidiana_02_Positivo1.png';
export const OSSIDIANA_PITTOGRAM_URL = 'https://media.base44.com/images/public/6a047f37242becec83398e6f/894346aba_PittogrammaOssidiana.png';

// Icone social ufficiali (bianche) da Simple Icons CDN
const SOCIAL_ICON_URLS = {
  instagram: 'https://cdn.simpleicons.org/instagram/ffffff',
  facebook: 'https://cdn.simpleicons.org/facebook/ffffff',
  tiktok: 'https://cdn.simpleicons.org/tiktok/ffffff',
};

export async function urlToDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function getMeta(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function iconImg(x, dataUrl) {
  if (!dataUrl) return '';
  return `\n  <image x="${x}" y="587" width="26" height="26" href="${dataUrl}" xlink:href="${dataUrl}"/>`;
}

/**
 * assets: { qr, logo, logoMeta, pictogram, social: {instagram, facebook, tiktok} }
 */
export function buildQrCardSvg(turno, assets) {
  const { qr, logo, logoMeta, pictogram, social } = assets || {};
  const isLunch = turno === 'pranzo';
  const title = isLunch ? 'MENÙ PRANZO' : 'MENÙ CENA';
  const descLines = isLunch
    ? ['Scansiona il QR code per consultare', 'il nostro menù del pranzo.']
    : ['Scansiona il QR code per consultare', 'il nostro menù della cena.'];

  // Header — pannello crema col logo reale (larghezza proporzionata)
  let header = '';
  if (logo && logoMeta) {
    const h = 62;
    const w = Math.min(500, Math.round(h * (logoMeta.w / logoMeta.h)));
    const panelW = w + 56;
    header = `
  <rect x="44" y="44" width="${panelW}" height="94" rx="12" fill="${CREAM}"/>
  <image x="72" y="60" width="${w}" height="${h}" href="${logo}" xlink:href="${logo}"/>`;
  } else {
    header = `
  <rect x="44" y="44" width="380" height="94" rx="12" fill="${CREAM}"/>
  <text x="72" y="90" font-family="Georgia, serif" font-size="30" font-weight="bold" letter-spacing="6" fill="#33373b">OSSIDIANA</text>
  <text x="72" y="112" font-family="Arial, sans-serif" font-size="11" letter-spacing="4" fill="${BRONZE}">CUCINA CONTEMPORANEA</text>`;
  }

  // QR centrato nel riquadro bianco (card 631..961 → centro x=796, QR 256px → x=668)
  const qrBlock = qr
    ? `<image x="668" y="201" width="256" height="256" href="${qr}" xlink:href="${qr}"/>`
    : `<rect x="668" y="201" width="256" height="256" fill="#eeeeee"/>`;

  // Footer sinistro: pittogramma + icone social + profilo
  const pictBlock = pictogram
    ? `<rect x="60" y="578" width="44" height="44" rx="6" fill="none" stroke="${BRONZE}" stroke-width="1"/>
  <image x="64" y="582" width="36" height="36" href="${pictogram}" xlink:href="${pictogram}"/>`
    : `<rect x="60" y="578" width="44" height="44" fill="none" stroke="${BRONZE}" stroke-width="1"/>`;

  const socialBlock = iconImg(120, social?.instagram)
    + iconImg(154, social?.facebook)
    + iconImg(188, social?.tiktok);
  const handleText = socialBlock
    ? `<text x="228" y="605" font-family="Arial, sans-serif" font-size="13" letter-spacing="1" fill="#ffffff" fill-opacity="0.6">ossidiana.ristorante</text>`
    : `<text x="120" y="605" font-family="Arial, sans-serif" font-size="13" letter-spacing="1" fill="#ffffff" fill-opacity="0.6">Instagram · Facebook · TikTok: ossidiana.ristorante</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1063" height="709" viewBox="0 0 1063 709">
  <defs>
    <clipPath id="cardClip"><rect width="1063" height="709" rx="20"/></clipPath>
  </defs>
  <g clip-path="url(#cardClip)">
    <rect width="1063" height="709" fill="${NAVY}"/>
    <polygon points="1063,0 1063,400 660,0" fill="#16222e" opacity="0.55"/>
    <polygon points="0,709 0,460 340,709" fill="#131e2a" opacity="0.5"/>
    <polygon points="1063,709 1063,540 870,709" fill="#16222e" opacity="0.4"/>
    <polygon points="430,0 640,0 350,150" fill="#131e2a" opacity="0.35"/>
  </g>
  <rect x="1.5" y="1.5" width="1060" height="706" rx="19" fill="none" stroke="${BRONZE}" stroke-width="3"/>
  <rect x="10" y="10" width="1043" height="689" rx="12" fill="none" stroke="${BRONZE}" stroke-width="1"/>${header}
  <text x="60" y="238" font-family="Georgia, serif" font-size="58" font-weight="bold" letter-spacing="2" fill="#ffffff">${title}</text>
  <rect x="60" y="258" width="120" height="2" fill="${BRONZE}"/>
  <text x="60" y="302" font-family="Arial, sans-serif" font-size="17" font-weight="bold" letter-spacing="5" fill="#ffffff">INQUADRA • SCEGLI • GUSTA</text>
  <text x="60" y="336" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.75">${descLines[0]}</text>
  <text x="60" y="360" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.75">${descLines[1]}</text>
  ${pictBlock}${socialBlock}
  ${handleText}
  <text x="60" y="652" font-family="Arial, sans-serif" font-size="14" letter-spacing="3" fill="#ffffff" fill-opacity="0.5">ossidianarestaurant.com</text>
  <rect x="631" y="130" width="330" height="450" rx="16" fill="#ffffff"/>${qrBlock}
  <text x="796" y="494" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="bold" letter-spacing="3" fill="#1a1a1a">SCANSIONA IL MENÙ</text>
  <rect x="741" y="506" width="110" height="2" fill="${BRONZE}"/>
</svg>`;
}

/** Scarica QR, logo, pittogramma e icone social come data URL e costruisce l'SVG della tessera. */
export async function buildQrCard(turno, qrUrl) {
  const [qr, logo, pictogram, instagram, facebook, tiktok] = await Promise.all([
    urlToDataUrl(qrUrl).catch(() => null),
    urlToDataUrl(OSSIDIANA_LOGO_URL).catch(() => null),
    urlToDataUrl(OSSIDIANA_PITTOGRAM_URL).catch(() => null),
    urlToDataUrl(SOCIAL_ICON_URLS.instagram).catch(() => null),
    urlToDataUrl(SOCIAL_ICON_URLS.facebook).catch(() => null),
    urlToDataUrl(SOCIAL_ICON_URLS.tiktok).catch(() => null),
  ]);
  const logoMeta = logo ? await getMeta(logo) : null;
  return buildQrCardSvg(turno, {
    qr, logo, logoMeta, pictogram,
    social: { instagram, facebook, tiktok },
  });
}

/** Rasterizza l'SVG in PNG (default 1063x709 = 9x6 cm @ 300 DPI). */
export async function svgToPngDataUrl(svg, width = 1063, height = 709) {
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = blobUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}