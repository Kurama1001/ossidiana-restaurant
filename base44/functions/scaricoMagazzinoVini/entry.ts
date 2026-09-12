import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * VERSIONE TEMPORANEA DI DIAGNOSTICA.
 * Cattura la forma del payload ricevuto dall'automazione e l'eventuale
 * sessione utente, e li registra in un record EmailLog di debug.
 */

async function safeMe(base44) {
  try { return await base44.auth.me(); } catch { return null; }
}

export default async function (req) {
  let rawBody = null;
  try { rawBody = await req.text(); } catch { /* corpo illeggibile */ }
  let debug = { note: 'pre-init' };
  try {
    const base44 = createClientFromRequest(req);
    const user = await safeMe(base44);
    debug = {
      user: user ? { id: user.id, role: user.role, email: user.email } : null,
      hasAuthorization: !!req.headers.get('authorization'),
      hasServiceAuth: !!req.headers.get('base44-service-authorization'),
      body: (rawBody || '').slice(0, 150),
    };
    await base44.asServiceRole.entities.EmailLog.create({
      email_type: 'debug_automation',
      recipient: 'debug',
      subject: 'scarico debug',
      last_error: JSON.stringify(debug).slice(0, 900),
    });
    return Response.json({ success: true, debug: true });
  } catch (error) {
    console.error('scarico debug error:', error.message, JSON.stringify(debug).slice(0, 400));
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}