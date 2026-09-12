import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Scarico magazzino vini: decrementa le bottiglie quando viene creata una
 * riga d'ordine di categoria vino (automazione server-side su RigaOrdine).
 *
 * Sicurezza: il body fornisce solo l'id della riga; articolo, quantità,
 * categoria e stato vengono riletti dal database (asServiceRole) e verificati
 * lato server, con flag di idempotenza per evitare scarichi ripetuti.
 * Un payload contraffatto non può quindi scegliere l'articolo né la quantità.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Unico input accettato: l'id della riga (payload automazione o chiamata admin)
    const id = typeof body?.id === 'string' ? body.id : (typeof body?.data?.id === 'string' ? body.data.id : null);
    if (!id) {
      return Response.json({ success: true, skipped: true, reason: 'missing_id' });
    }

    const svc = base44.asServiceRole;

    // Rilegge la riga dal database: nessun campo del body è attendibile
    let riga;
    try {
      riga = await svc.entities.RigaOrdine.get(id);
    } catch {
      riga = null;
    }
    if (!riga) {
      return Response.json({ success: true, skipped: true, reason: 'riga_not_found' });
    }

    // Idempotenza: ogni riga viene scalata al massimo una volta
    if (riga.magazzino_scaricato) {
      return Response.json({ success: true, skipped: true, reason: 'already_processed' });
    }

    if (riga.categoria !== 'vino' || !riga.menu_item_id) {
      return Response.json({ success: true, skipped: true });
    }
    if (riga.stato === 'bozza' || riga.stato === 'annullato') {
      return Response.json({ success: true, skipped: true });
    }
    const qta = Number(riga.quantita || 0);
    if (qta <= 0) {
      return Response.json({ success: true, skipped: true });
    }

    // Verifica lato server che il target sia davvero un vino del menu
    let item;
    try {
      item = await svc.entities.MenuItem.get(riga.menu_item_id);
    } catch {
      item = null;
    }
    if (!item || item.category !== 'vino') {
      return Response.json({ success: true, skipped: true, reason: 'not_a_wine' });
    }

    // Reclama la riga PRIMA di scalare: un replay non può effettuare un doppio scarico
    await svc.entities.RigaOrdine.update(id, { magazzino_scaricato: true });

    // Assicura che il campo quantita esista (default 0) prima del decremento atomico
    if (item.quantita == null) {
      await svc.entities.MenuItem.update(item.id, { quantita: 0 });
    }
    await svc.entities.MenuItem.updateMany(
      { id: riga.menu_item_id },
      { $inc: { quantita: -qta } }
    );

    // Clamp a 0 se sotto zero
    const updated = await svc.entities.MenuItem.get(riga.menu_item_id).catch(() => null);
    if (updated && typeof updated.quantita === 'number' && updated.quantita < 0) {
      await svc.entities.MenuItem.update(riga.menu_item_id, { quantita: 0 });
    }

    return Response.json({ success: true, scaricato: qta });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}