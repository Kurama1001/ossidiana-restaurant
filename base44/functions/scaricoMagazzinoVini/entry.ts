import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Scarico automatico del magazzino vini.
 * Richiamato dal workflow quando viene creata una RigaOrdine con categoria "vino".
 *
 * Sicurezza:
 * - richiede una sessione utente con ruolo del personale autorizzato
 *   (admin/cameriere/cucina/bar); il workflow invoca con sessione admin;
 * - tutti i dati sono letti lato server dall'id della riga: nessun dato
 *   del payload è considerato attendibile;
 * - idempotente: la riga viene marcata "magazzino_scaricato" dopo lo scarico.
 */

const RUOLI_AUTORIZZATI = ['admin', 'cameriere', 'cucina', 'bar'];
const CALICI_PER_BOTTIGLIA = 5;

async function safeMe(base44) {
  try { return await base44.auth.me(); } catch { return null; }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // ── Auth: sessione del personale autorizzato ──
    const user = await safeMe(base44);
    if (!user || !RUOLI_AUTORIZZATI.includes(user.role)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ── Id riga dal payload (forma workflow: {data: {id}}) ──
    let body = null;
    try { body = await req.json(); } catch { /* payload vuoto */ }
    const rigaId = body?.data?.id || body?.id;
    if (!rigaId) {
      return Response.json({ success: false, error: 'riga_id mancante' }, { status: 400 });
    }

    // ── Lettura server-side della riga ──
    const righe = await base44.asServiceRole.entities.RigaOrdine.filter({ id: rigaId }, undefined, 1);
    const riga = righe && righe[0];
    if (!riga) {
      return Response.json({ success: true, skipped: 'riga_non_trovata' });
    }

    // Idempotenza: riga già scalata in precedenza
    if (riga.magazzino_scaricato) {
      return Response.json({ success: true, skipped: 'gia_scalata' });
    }
    if (riga.categoria !== 'vino') {
      return Response.json({ success: true, skipped: 'categoria_non_vino' });
    }

    // ── Articolo vino corrispondente (letto lato server) ──
    const items = await base44.asServiceRole.entities.MenuItem.filter({ id: riga.menu_item_id }, undefined, 1);
    const item = items && items[0];
    if (!item) {
      return Response.json({ success: true, skipped: 'menu_item_non_trovato' });
    }
    if (item.category !== 'vino') {
      return Response.json({ success: true, skipped: 'item_non_vino' });
    }

    const giacenza = item.quantita == null ? null : Number(item.quantita);
    if (giacenza == null || giacenza <= 0) {
      // Giacenza non tracciata o esaurita: marca la riga per non riprovarla
      await base44.asServiceRole.entities.RigaOrdine.update(rigaId, { magazzino_scaricato: true });
      return Response.json({ success: true, skipped: 'giacenza_non_disponibile' });
    }

    // Bottiglia intera, oppure calice (1 bottiglia = 4 calici)
    const isCalice = (riga.nome_item || '').includes('(Calice)');
    const qta = Number(riga.quantita) || 1;
    const daScaricare = isCalice ? qta / CALICI_PER_BOTTIGLIA : qta;
    const nuovaGiacenza = Math.max(0, Number((giacenza - daScaricare).toFixed(2)));

    await base44.asServiceRole.entities.MenuItem.update(item.id, {
      quantita: nuovaGiacenza,
      da_ordinare: nuovaGiacenza <= 3,
    });

    // Idempotenza: marca la riga come scalata
    await base44.asServiceRole.entities.RigaOrdine.update(rigaId, { magazzino_scaricato: true });

    return Response.json({
      success: true,
      menu_item: item.name,
      calice: isCalice,
      da_scaricare: daScaricare,
      nuova_giacenza: nuovaGiacenza,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}