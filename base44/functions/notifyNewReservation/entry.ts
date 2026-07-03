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

    // Only send email for site reservations
    if (data.fonte_prenotazione && data.fonte_prenotazione !== 'sito') {
      return Response.json({ success: true, skipped: true });
    }

    // Get all admin users
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');

    if (admins.length === 0) {
      return Response.json({ success: true, skipped: true, reason: 'no_admins' });
    }

    const emailBody = [
      'Nuova prenotazione ricevuta dal sito:',
      '',
      `Nome: ${data.customer_name || 'N/A'}`,
      `Telefono: ${data.phone || 'N/A'}`,
      `Email: ${data.email || 'N/A'}`,
      `Data: ${data.res_date || 'N/A'}`,
      `Ora: ${data.res_time || 'N/A'}`,
      `Coperti: ${data.guests || 'N/A'}`,
      `Note: ${data.notes || 'Nessuna'}`
    ].join('\n');

    let sentCount = 0;
    for (const admin of admins) {
      if (admin.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: 'Nuova prenotazione Ossidiana',
            body: emailBody
          });
          sentCount++;
        } catch (_e) {
          // Continue to next admin
        }
      }
    }

    // Mark as notified
    if (data.id) {
      try {
        await base44.asServiceRole.entities.Reservation.update(data.id, { notificata_admin: true });
      } catch (_e) {
        // Non-critical
      }
    }

    return Response.json({ success: true, sent: sentCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});