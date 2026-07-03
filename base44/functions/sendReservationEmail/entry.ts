import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return Response.json({ error: 'Parametri mancanti: to, subject, body' }, { status: 400 });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    if (!apiKey || !fromEmail) {
      return Response.json({ error: 'Configurazione email mancante' }, { status: 500 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Ossidiana <${fromEmail}>`,
        to: [to],
        subject: subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Errore Resend: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ success: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});