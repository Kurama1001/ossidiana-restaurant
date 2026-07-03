import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FROM_EMAIL = 'Ossidiana Restaurant <prenotazioni@ossidianarestaurant.com>';
const REPLY_TO = 'amministrazione@ossidianarestaurant.com';
const ADMIN_EMAIL = 'amministrazione@ossidianarestaurant.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, reservationId, motivo } = await req.json();

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return Response.json({ success: false, error: 'RESEND_API_KEY non configurata' }, { status: 500 });
    }

    let result;
    switch (action) {
      case 'test':
        result = await handleTestEmail(base44, apiKey);
        break;
      case 'booking_received_admin':
        result = await handleBookingReceivedAdmin(base44, apiKey, reservationId);
        break;
      case 'booking_confirmation':
        result = await handleBookingEmail(base44, apiKey, reservationId, 'booking_confirmation');
        break;
      case 'booking_rejection':
        result = await handleBookingEmail(base44, apiKey, reservationId, 'booking_rejection', motivo);
        break;
      case 'booking_update':
        result = await handleBookingEmail(base44, apiKey, reservationId, 'booking_update');
        break;
      case 'booking_cancellation':
        result = await handleBookingEmail(base44, apiKey, reservationId, 'booking_cancellation');
        break;
      default:
        return Response.json({ success: false, error: 'Azione non riconosciuta: ' + action }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('emailService error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

// ─── Core send + log ───

async function sendAndLog(base44, apiKey, { to, subject, html, emailType, reservationId }) {
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
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.message || data.error || JSON.stringify(data);
      console.error(`Resend error (${emailType} → ${to}):`, errMsg);
      await logEmail(base44, { email_type: emailType, recipient: to, subject, delivery_status: 'failed', last_error: errMsg, reservation_id: reservationId });
      return { success: false, error: errMsg };
    }

    const messageId = data.id || null;
    await logEmail(base44, { email_type: emailType, recipient: to, subject, message_id: messageId, delivery_status: 'sent', reservation_id: reservationId });
    return { success: true, messageId };
  } catch (e) {
    console.error(`sendAndLog error (${emailType}):`, e.message);
    await logEmail(base44, { email_type: emailType, recipient: to, subject, delivery_status: 'failed', last_error: e.message, reservation_id: reservationId });
    return { success: false, error: e.message };
  }
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

async function getReservation(base44, reservationId) {
  if (!reservationId) return null;
  try {
    return await base44.asServiceRole.entities.Reservation.get(reservationId);
  } catch {
    return null;
  }
}

// ─── Action handlers ───

async function handleTestEmail(base44, apiKey) {
  const html = emailTemplate(`
    <h2 style="margin:0 0 20px;color:#C69C6D;font-size:22px;letter-spacing:2px;">Test Integrazione</h2>
    <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">
      Se stai leggendo questa email significa che l'integrazione tra Base44 e Resend &egrave; configurata correttamente.
    </p>
  `);
  return sendAndLog(base44, apiKey, {
    to: ADMIN_EMAIL,
    subject: 'Test integrazione Resend',
    html,
    emailType: 'test',
  });
}

async function handleBookingReceivedAdmin(base44, apiKey, reservationId) {
  const r = await getReservation(base44, reservationId);
  if (!r) return { success: false, error: 'Prenotazione non trovata' };

  const html = emailTemplate(`
    <h2 style="margin:0 0 20px;color:#C69C6D;font-size:22px;letter-spacing:2px;">Nuova Prenotazione dal Sito</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);width:120px;">Nome</td><td style="padding:8px 0;color:#E5E5E5;font-weight:bold;">${r.customer_name || 'N/A'}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Telefono</td><td style="padding:8px 0;color:#E5E5E5;">${r.phone || 'N/A'}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Email</td><td style="padding:8px 0;color:#E5E5E5;">${r.email || 'N/A'}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Data</td><td style="padding:8px 0;color:#E5E5E5;">${r.res_date || 'N/A'}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Ora</td><td style="padding:8px 0;color:#E5E5E5;">${r.res_time || 'N/A'}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(229,229,229,0.5);">Coperti</td><td style="padding:8px 0;color:#C69C6D;font-weight:bold;">${r.guests || 'N/A'}</td></tr>
    </table>
    ${r.notes ? `<p style="margin:20px 0 0;color:rgba(229,229,229,0.5);font-size:13px;">Note: <span style="color:#E5E5E5;">${r.notes}</span></p>` : ''}
  `);
  return sendAndLog(base44, apiKey, {
    to: ADMIN_EMAIL,
    subject: 'Nuova prenotazione dal sito - Ossidiana',
    html,
    emailType: 'booking_received_admin',
    reservationId,
  });
}

async function handleBookingEmail(base44, apiKey, reservationId, emailType, motivo) {
  const r = await getReservation(base44, reservationId);
  if (!r) return { success: false, error: 'Prenotazione non trovata' };
  if (!r.email) return { success: false, skipped: true, reason: 'no_email' };

  const dateStr = r.res_date || '';
  const timeStr = r.res_time || '';
  const guests = r.guests || '';
  const name = r.customer_name || 'Cliente';

  let subject, content;

  if (emailType === 'booking_confirmation') {
    subject = 'Prenotazione confermata - Ossidiana';
    content = `
      <h2 style="margin:0 0 15px;color:#C69C6D;font-size:22px;letter-spacing:2px;">Prenotazione Confermata</h2>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ciao ${name},</p>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">La tua prenotazione da Ossidiana &egrave; <strong style="color:#C69C6D;">confermata</strong>:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:15px 0;">
        <tr><td style="padding:6px 0;color:rgba(229,229,229,0.5);width:100px;">Data</td><td style="padding:6px 0;color:#E5E5E5;font-weight:bold;">${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:rgba(229,229,229,0.5);">Ora</td><td style="padding:6px 0;color:#E5E5E5;font-weight:bold;">${timeStr}</td></tr>
        <tr><td style="padding:6px 0;color:rgba(229,229,229,0.5);">Coperti</td><td style="padding:6px 0;color:#E5E5E5;font-weight:bold;">${guests} persone</td></tr>
      </table>
      <div style="text-align:center;margin:30px 0;">
        <a href="mailto:amministrazione@ossidianarestaurant.com" style="display:inline-block;background:#C69C6D;color:#0A0A0B;padding:12px 30px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Contattaci</a>
      </div>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ti aspettiamo!</p>
    `;
  } else if (emailType === 'booking_rejection') {
    subject = 'Prenotazione non confermabile - Ossidiana';
    content = `
      <h2 style="margin:0 0 15px;color:#C69C6D;font-size:22px;letter-spacing:2px;">Prenotazione Non Confermabile</h2>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ciao ${name},</p>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ci dispiace ma non riusciamo a confermare la tua prenotazione per il giorno <strong>${dateStr}</strong> alle ore <strong>${timeStr}</strong>.</p>
      ${motivo ? `<p style="color:rgba(229,229,229,0.7);font-size:14px;line-height:1.8;padding:15px;background:rgba(198,156,109,0.08);border-left:3px solid #C69C6D;">Motivo: ${motivo}</p>` : ''}
      <div style="text-align:center;margin:30px 0;">
        <a href="mailto:amministrazione@ossidianarestaurant.com" style="display:inline-block;background:#C69C6D;color:#0A0A0B;padding:12px 30px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Contattaci per un altro orario</a>
      </div>
    `;
  } else if (emailType === 'booking_update') {
    subject = 'Prenotazione aggiornata - Ossidiana';
    content = `
      <h2 style="margin:0 0 15px;color:#C69C6D;font-size:22px;letter-spacing:2px;">Prenotazione Aggiornata</h2>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ciao ${name},</p>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">La tua prenotazione da Ossidiana &egrave; stata <strong style="color:#C69C6D;">aggiornata</strong>:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:15px 0;">
        <tr><td style="padding:6px 0;color:rgba(229,229,229,0.5);width:100px;">Data</td><td style="padding:6px 0;color:#E5E5E5;font-weight:bold;">${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:rgba(229,229,229,0.5);">Ora</td><td style="padding:6px 0;color:#E5E5E5;font-weight:bold;">${timeStr}</td></tr>
        <tr><td style="padding:6px 0;color:rgba(229,229,229,0.5);">Coperti</td><td style="padding:6px 0;color:#E5E5E5;font-weight:bold;">${guests} persone</td></tr>
      </table>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ti aspettiamo!</p>
    `;
  } else if (emailType === 'booking_cancellation') {
    subject = 'Prenotazione cancellata - Ossidiana';
    content = `
      <h2 style="margin:0 0 15px;color:#C69C6D;font-size:22px;letter-spacing:2px;">Prenotazione Cancellata</h2>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ciao ${name},</p>
      <p style="color:#E5E5E5;font-size:15px;line-height:1.8;">Ti informiamo che la prenotazione per il giorno <strong>${dateStr}</strong> alle ore <strong>${timeStr}</strong> &egrave; stata <strong style="color:#C69C6D;">cancellata</strong>.</p>
      <p style="color:rgba(229,229,229,0.7);font-size:14px;line-height:1.8;">Per maggiori informazioni non esitare a contattarci.</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="mailto:amministrazione@ossidianarestaurant.com" style="display:inline-block;background:#C69C6D;color:#0A0A0B;padding:12px 30px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Contattaci</a>
      </div>
    `;
  }

  return sendAndLog(base44, apiKey, {
    to: r.email,
    subject,
    html: emailTemplate(content),
    emailType,
    reservationId,
  });
}

// ─── HTML Template ───

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