import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // ── Auth: x-print-bridge-key ──
    const bridgeKey = req.headers.get('x-print-bridge-key');
    const expectedKey = Deno.env.get('PRINT_BRIDGE_API_KEY');
    if (!bridgeKey || !expectedKey || bridgeKey !== expectedKey) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ── Service role (no user auth needed: bridge is external) ──
    const base44 = createClientFromRequest(req);

    // ── Read up to 10 pending kitchen jobs, oldest first ──
    const pendingJobs = await base44.asServiceRole.entities.PrintJob.filter(
      { status: 'pending', target_printer: 'kitchen' },
      'created_date',
      10
    );

    if (pendingJobs.length === 0) {
      return Response.json({ success: true, jobs: [] });
    }

    // ── Claim: update each job to "processing", set claimed_at, increment attempts ──
    const now = new Date().toISOString();
    const claimed = [];
    for (const job of pendingJobs) {
      try {
        const updated = await base44.asServiceRole.entities.PrintJob.update(job.id, {
          status: 'processing',
          claimed_at: now,
          attempts: (job.attempts || 0) + 1,
        });
        claimed.push({
          id: updated.id,
          job_type: updated.job_type,
          target_printer: updated.target_printer,
          order_id: updated.order_id,
          payload: updated.payload,
          attempts: updated.attempts,
          created_date: updated.created_date,
        });
      } catch (e) {
        // If claim fails for one job (e.g. race condition), skip it
        console.error(`Claim failed for job ${job.id}:`, e.message);
      }
    }

    return Response.json({ success: true, jobs: claimed });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});