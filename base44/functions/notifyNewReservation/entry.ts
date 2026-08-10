import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FROM_EMAIL = 'Ossidiana Restaurant <prenotazioni@ossidianarestaurant.com>';
const REPLY_TO = 'amministrazione@ossidianarestaurant.com';
const ADMIN_EMAIL = 'amministrazione@ossidianarestaurant.com';

async function safeMe(base44) {
  try { return await base44.auth.me(); } catch { return null; }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailTemplate(content) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;min-height:100vh;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#161618;border:1px solid rgba(198,156,109,0.2);">
<tr>
<td align="center" style="padding:40px 20px 30px;border-bottom:1px solid rgba(198,156,109,0.15);">
<h1 style="margin:0;color:#C69C6D;font-size:28px;letter-spacing:8px;font-weight:normal;">OSSIDIANA</h1>
<p style="margin:5px 0 0;color:rgba(229,229,229,0.4);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Cucina Contemporanea</p>
</td>
</tr>
<tr>
<td style="padding:40px 30px;">
${content}
</td>
</tr>
<tr>
<td style="padding:30px 20px;border-top:1px solid rgba(198,156,109,0.15);">
<p style="margin:0;text-align:center;color:rgba(229,229,229,0.3);font-size:12px;line-height:1.8;">
Ossidiana Restaurant<br>
Roma<br>
Prenotazioni: prenotazioni@ossidianarestaurant.com<br>
Amministrazione: amministrazione@ossidianarestaurant.com
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

async function logEmail(base44, params) {
  try {
    await base44.asServiceRole.entities.EmailLog.create({
      email_type: params.email_type,
      recipient: params.recipient,
      subject: params.subject || '',
      message_id: params.message_id || null,
      delivery_status: params.delivery_status || 'sent',
      last_error: params.last_error || null,
      reservation_id: params.reservation_id || null,
      email_sent: params.delivery_status === 'sent',
      email_sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Errore log email:', e.message);
  }
}

async function sendAdminNotification(base44, apiKey, reservationId, r) {
  const html = emailTemplate(`
    <h2 style="margin:0 0 20px;color:#C69C6D;font-size:22px;letter-spacing:2px;">Nuova Prenotazione dal Sito</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);width:120px;">Nome</td><td style="padding:8px 0;color:#E5E5E5;font-weight:bold;">${escapeHtml(r.customer_name || 'N/A')}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Telefono</td><td style="padding:8px 0;color:#E5E5E5;">${escapeHtml(r.phone || 'N/A')}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Email</td><td style="padding:8px 0;color:#E5E5E5;">${escapeHtml(r.email || 'N/A')}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Data</td><td style="padding:8px 0;color:#E5E5E5;">${escapeHtml(r.res_date || 'N/A')}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Ora</td><td style="padding:8px 0;color:#E5E5E5;">${escapeHtml(r.res_time || 'N/A')}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Coperti</td><td style="padding:8px 0;color:#C69C6D;font-weight:bold;">${escapeHtml(String(r.guests ?? 'N/A'))}</td></tr>
    </table>
    ${r.notes ? `<p style="margin:20px 0 0;color:rgba(229,229,229,0.5);font-size:13px;">Note: <span style="color:#E5E5E5;">${escapeHtml(r.notes)}</span></p>` : ''}
  `);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        reply_to: REPLY_TO,
        to: [ADMIN_EMAIL],
        subject: 'Nuova prenotazione dal sito - Ossidiana',
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.message || data.error || JSON.stringify(data);
      console.error(`Resend error (booking_received_admin → ${ADMIN_EMAIL}):`, errMsg);
      await logEmail(base44, { email_type: 'booking_received_admin', recipient: ADMIN_EMAIL, subject: 'Nuova prenotazione dal sito - Ossidiana', delivery_status: 'failed', last_error: errMsg, reservation_id: reservationId });
      return { success: false, error: errMsg };
    }
    await logEmail(base44, { email_type: 'booking_received_admin', recipient: ADMIN_EMAIL, subject: 'Nuova prenotazione dal sito - Ossidiana', message_id: data.id || null, delivery_status: 'sent', reservation_id: reservationId });
    return { success: true, messageId: data.id || null };
  } catch (e) {
    console.error(`sendAdminNotification error:`, e.message);
    await logEmail(base44, { email_type: 'booking_received_admin', recipient: ADMIN_EMAIL, subject: 'Nuova prenotazione dal sito - Ossidiana', delivery_status: 'failed', last_error: e.message, reservation_id: reservationId });
    return { success: false, error: e.message };
  }
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

      // Send admin notification email directly (no user session available here)
      const apiKey = Deno.env.get('RESEND_API_KEY');
      if (apiKey) {
        try {
          await sendAdminNotification(base44, apiKey, data.id, reservation);
        } catch (e) {
          console.error('Errore invio email admin:', e.message);
        }
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