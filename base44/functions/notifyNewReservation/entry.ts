import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const data = body.data || body;

    // Only for site reservations
    if (data.fonte_prenotazione && data.fonte_prenotazione !== 'sito') {
      return Response.json({ success: true, skipped: true });
    }

    // Send admin notification via emailService
    if (data.id) {
      try {
        await base44.asServiceRole.functions.invoke('emailService', {
          action: 'booking_received_admin',
          reservationId: data.id,
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