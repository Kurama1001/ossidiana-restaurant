import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function safeMe(base44) {
  try { return await base44.auth.me(); } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Auth: this function is triggered by the Reservation "create" entity automation,
    // which runs server-side with no user session. Restrict invocation to that
    // automation payload contract, or to an authenticated admin.
    const user = await safeMe(base44);
    const isAutomation = body?.event?.type === 'create' && body?.event?.entity_name === 'Reservation';
    if (!isAutomation && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = body.data || body;

    // Only for site reservations
    if (data.fonte_prenotazione && data.fonte_prenotazione !== 'sito') {
      return Response.json({ success: true, skipped: true });
    }

    if (data.id) {
      // Validate the reservation exists and hasn't already been notified (idempotency)
      let reservation;
      try {
        reservation = await base44.asServiceRole.entities.Reservation.get(data.id);
      } catch {
        reservation = null;
      }
      if (!reservation) {
        return Response.json({ success: false, error: 'Reservation not found' }, { status: 404 });
      }
      if (reservation.notificata_admin) {
        return Response.json({ success: true, skipped: true, reason: 'already_notified' });
      }

      // Send admin notification via emailService (internal token, no user session)
      const internalToken = Deno.env.get('INTERNAL_API_TOKEN');
      try {
        await base44.asServiceRole.functions.invoke('emailService', {
          action: 'booking_received_admin',
          reservationId: data.id,
          internalToken,
        });
      } catch (e) {
        console.error('Errore invio email admin:', e.message);
      }

      // Mark as notified
      try {
        await base44.asServiceRole.entities.Reservation.update(data.id, { notificata_admin: true });
      } catch (_e) {
        // Non-critical
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});