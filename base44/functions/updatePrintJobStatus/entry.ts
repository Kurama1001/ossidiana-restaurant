import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // ── Auth: x-print-bridge-key ──
    const bridgeKey = req.headers.get('x-print-bridge-key');
    const expectedKey = Deno.env.get('PRINT_BRIDGE_API_KEY');
    if (!bridgeKey || !expectedKey || bridgeKey !== expectedKey) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { job_id, status, error_message } = body;

    if (!job_id) {
      return Response.json({ success: false, error: 'job_id is required' }, { status: 400 });
    }

    if (status !== 'completed' && status !== 'failed') {
      return Response.json({ success: false, error: 'status must be "completed" or "failed"' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // ── Verify job exists ──
    const job = await base44.asServiceRole.entities.PrintJob.filter({ id: job_id }, undefined, 1);
    if (!job || job.length === 0) {
      return Response.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    // ── Update based on status ──
    const now = new Date().toISOString();
    let updateData;
    if (status === 'completed') {
      updateData = {
        status: 'completed',
        completed_at: now,
        error_message: '',
      };
    } else {
      updateData = {
        status: 'failed',
        error_message: error_message || '',
      };
    }

    await base44.asServiceRole.entities.PrintJob.update(job_id, updateData);

    return Response.json({ success: true, job_id, status });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});