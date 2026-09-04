import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function safeMe(base44) {
  try { return await base44.auth.me(); } catch { return null; }
}

/**
 * Scarico magazzino vini.
 * Triggerato dall'automazione "entity create" su RigaOrdine (categoria vino),
 * oppure invocabile da admin per uno scarico manuale.
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

    // Auth: automazione server-side (nessuna sessione utente) oppure admin
    const user = await safeMe(base44);
    const isAutomation = body?.event?.type === 'create' && body?.event?.entity_name === 'RigaOrdine';
    if (!isAutomation && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const riga = body.data || body;
    if (!riga || riga.categoria !== 'vino' || !riga.menu_item_id) {
      return Response.json({ success: true, skipped: true });
    }
    if (riga.stato === 'bozza' || riga.stato === 'annullato') {
      return Response.json({ success: true, skipped: true });
    }

    const qta = Number(riga.quantita || 0);
    if (qta <= 0) {
      return Response.json({ success: true, skipped: true });
    }

    const svc = base44.asServiceRole;

    // Assicura che il campo quantita esista (default 0) prima dell'incremento atomico
    let item;
    try {
      item = await svc.entities.MenuItem.get(riga.menu_item_id);
    } catch {
      item = null;
    }
    if (!item) {
      return Response.json({ success: true, skipped: true, reason: 'menu_item_not_found' });
    }
    if (item.quantita == null) {
      await svc.entities.MenuItem.update(item.id, { quantita: 0 });
    }

    // Decremento atomico
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