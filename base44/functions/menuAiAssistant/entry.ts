import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const action = body?.action;

    if (action === 'generate_description') {
      const name = String(body?.name || '').trim();
      const category = String(body?.category || '').trim();
      if (!name || name.length > 200) {
        return Response.json({ error: 'Nome piatto mancante o non valido' }, { status: 400 });
      }
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Scrivi una descrizione breve e appetitosa (max 2 righe, tono elegante, italiano) per un piatto di ristorante chiamato "${name}"${category ? ` nella categoria "${category}"` : ''}. Rispondi solo con la descrizione, senza virgolette.`,
        response_json_schema: { type: 'object', properties: { description: { type: 'string' } } },
      });
      return Response.json({ description: res.description || '' });
    }

    if (action === 'generate_image') {
      const prompt = String(body?.prompt || '').trim();
      if (!prompt || prompt.length > 1000) {
        return Response.json({ error: 'Prompt mancante o non valido' }, { status: 400 });
      }
      const res = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
      return Response.json({ url: res.url });
    }

    return Response.json({ error: 'Azione non valida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}