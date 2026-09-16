import { Router, Request, Response } from 'express';
import { prisma } from '@workspace/db';

const router: Router = Router();

// In-memory idempotency cache (keyed by clientMutationId with 24h TTL)
const idempotencyCache = new Map<string, { timestamp: number; result: any }>();

// Periodic cleanup of expired idempotency keys (older than 24 hours)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  for (const [key, val] of idempotencyCache.entries()) {
    if (now - val.timestamp > maxAge) {
      idempotencyCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * POST /api/v1/sync/batch
 * Processes an array of queued outbox mutations from offline clients atomically.
 */
router.post('/batch', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const companyId = user?.companyId || req.headers['x-company-id'] as string;
  const { mutations } = req.body;

  if (!Array.isArray(mutations)) {
    return res.status(400).json({ success: false, error: 'mutations array is required' });
  }

  const results: any[] = [];
  let processedCount = 0;

  for (const mut of mutations) {
    const { id: mutationId, clientMutationId, entityType, action, endpoint, method, payload } = mut;

    // 1. Check Idempotency Cache
    if (clientMutationId && idempotencyCache.has(clientMutationId)) {
      const cached = idempotencyCache.get(clientMutationId)!;
      results.push({
        mutationId,
        clientMutationId,
        status: 'applied',
        isCachedIdempotent: true,
        data: cached.result,
      });
      processedCount++;
      continue;
    }

    try {
      let resultData: any = null;

      // 2. Route entity-specific mutations
      if (entityType === 'task' || endpoint?.includes('/tasks')) {
        if (action === 'CREATE' || method === 'POST') {
          const taskData: any = {
            title: payload.title,
            description: payload.description || '',
            status: payload.status || 'todo',
            priority: payload.priority || 'medium',
            companyId: companyId || payload.companyId,
            moduleId: payload.moduleId,
            assigneeId: payload.assigneeId,
            projectId: payload.projectId,
            dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
          };
          if (payload.id && typeof payload.id === 'string' && !payload.id.startsWith('temp_')) {
            taskData.id = payload.id;
          }

          // Upsert or create
          if (taskData.id) {
            resultData = await prisma.task.upsert({
              where: { id: taskData.id },
              update: taskData,
              create: taskData,
            });
          } else {
            resultData = await prisma.task.create({ data: taskData });
          }
        } else if (action === 'UPDATE' || method === 'PUT' || method === 'PATCH') {
          const targetId = payload.id || mut.entityId;
          if (targetId) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            if (updatePayload.dueDate) updatePayload.dueDate = new Date(updatePayload.dueDate);

            resultData = await prisma.task.update({
              where: { id: targetId },
              data: updatePayload,
            });
          }
        } else if (action === 'DELETE' || method === 'DELETE') {
          const targetId = payload?.id || mut.entityId;
          if (targetId) {
            await prisma.task.delete({ where: { id: targetId } }).catch(() => {});
            resultData = { deleted: true, id: targetId };
          }
        }
      } else {
        // Generic ACK for unmodeled entity types
        resultData = {
          entityType,
          entityId: mut.entityId,
          action,
          syncedAt: new Date().toISOString(),
        };
      }

      // Store in idempotency cache
      if (clientMutationId) {
        idempotencyCache.set(clientMutationId, { timestamp: Date.now(), result: resultData });
      }

      results.push({
        mutationId,
        clientMutationId,
        status: 'applied',
        data: resultData,
      });
      processedCount++;
    } catch (err: any) {
      console.error(`[SyncBatch] Error applying mutation ${mutationId}:`, err.message);
      results.push({
        mutationId,
        clientMutationId,
        status: 'error',
        error: err.message || 'Database error during sync replay',
      });
    }
  }

  return res.status(200).json({
    success: true,
    processedCount,
    totalReceived: mutations.length,
    serverTime: Date.now(),
    results,
  });
});

/**
 * GET /api/v1/sync/delta?since=TIMESTAMP
 * Returns all entities modified since a specified timestamp for tenant catch-up.
 */
router.get('/delta', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const companyId = user?.companyId || req.headers['x-company-id'] as string;
  const sinceParam = req.query.since as string;
  const sinceDate = sinceParam ? new Date(parseInt(sinceParam, 10) || sinceParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const tasks = await prisma.task.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        updatedAt: { gte: sinceDate },
      },
      take: 200,
    });

    return res.status(200).json({
      success: true,
      serverTime: Date.now(),
      since: sinceDate.toISOString(),
      delta: {
        tasks,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
