import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // ── Auth: x-print-bridge-key ──
    const bridgeKey = req.headers.get('x-print-bridge-key');
    const expectedKey = Deno.env.get('PRINT_BRIDGE_API_KEY');
    if (!bridgeKey || !expectedKey || bridgeKey !== expectedKey) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // ── Find jobs in "processing" with claimed_at older than 5 minutes ──
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Fetch all processing jobs (claim_at is a string ISO timestamp)
    const processingJobs = await base44.asServiceRole.entities.PrintJob.filter(
      { status: 'processing' },
      'created_date',
      200
    );

    const staleJobs = processingJobs.filter(j => {
      if (!j.claimed_at) return true; // no claim time = stale
      return new Date(j.claimed_at).getTime() < new Date(fiveMinutesAgo).getTime();
    });

    let resetCount = 0;
    let failedCount = 0;

    for (const job of staleJobs) {
      try {
        if ((job.attempts || 0) >= 3) {
          await base44.asServiceRole.entities.PrintJob.update(job.id, {
            status: 'failed',
            error_message: 'Numero massimo di tentativi raggiunto',
          });
          failedCount++;
        } else {
          await base44.asServiceRole.entities.PrintJob.update(job.id, {
            status: 'pending',
          });
          resetCount++;
        }
      } catch (e) {
        console.error(`Reset failed for job ${job.id}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      reset_to_pending: resetCount,
      marked_failed: failedCount,
      total_processed: staleJobs.length,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});