import http from 'http';
import { Router, Request, Response } from 'express';
import {
  MAX_MUTATIONS_PER_PUSH,
  classifyMutation,
  mapHttpStatus,
  validateBody,
  type PushStatus,
  type SyncEntityRule,
} from './sync-policy';
import { acquireLock, getOutcome, releaseLock, saveOutcome, type StoredOutcome } from './sync-idempotency';

/**
 * Offline sync API.
 *
 *   POST /sync/push   replay queued client writes
 *   GET  /sync/pull   incremental, tenant- and permission-scoped changes since a cursor
 *
 * Security model (why this is not a plain Prisma writer):
 *  - Identity comes ONLY from the verified JWT (`req.user`). No header (x-company-id etc.) is trusted.
 *  - Writes are replayed against the real REST routes over loopback using the caller's own bearer token, so every
 *    guard and business rule (requireManager, requireAccess, requirePermission, subscription guards, relation
 *    normalisation, automations, sockets) applies exactly as it would online. Sync can never do more than REST.
 *  - Reads use the tenant-scoped `req.prisma` and mirror the REST visibility rules.
 */

const router: Router = Router();

const PUSH_CALL_TIMEOUT_MS = 30_000;
const PUSH_TIME_BUDGET_MS = 20_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

interface PushResult {
  clientMutationId: string;
  status: PushStatus;
  reason?: string;
  message?: string;
  httpStatus?: number;
  data?: unknown;
  /** Present on conflicts caused by concurrent edits: the current server copy. */
  serverEntity?: unknown;
  replayed?: boolean;
  retryAfterMs?: number;
}

function callRest(opts: {
  port: number;
  method: string;
  path: string;
  bodyJson: string;
  authorization: string;
  clientIp: string;
  clientMutationId: string;
}): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = {
      Authorization: opts.authorization,
      Accept: 'application/json',
      'X-Forwarded-For': opts.clientIp,
      'X-Idempotency-Key': opts.clientMutationId,
      'X-Sync-Replay': '1',
    };
    if (opts.bodyJson) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(opts.bodyJson);
    }

    const req = http.request(
      { host: '127.0.0.1', port: opts.port, method: opts.method, path: opts.path, headers, timeout: PUSH_CALL_TIMEOUT_MS },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (c: Buffer) => {
          size += c.length;
          if (size <= MAX_RESPONSE_BYTES) chunks.push(c);
        });
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data: unknown = text;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            /* non-JSON body: keep text */
          }
          resolve({ status: res.statusCode || 500, data });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('replay timeout')));
    req.on('error', reject);
    if (opts.bodyJson) req.write(opts.bodyJson);
    req.end();
  });
}

function errorMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const m = d.message ?? d.error;
    if (typeof m === 'string') return m.slice(0, 300);
  }
  return undefined;
}

/**
 * Looks the target row up through the tenant-scoped client. Returns:
 *  - 'missing' if it does not exist (or was soft-deleted) for this tenant
 *  - the current updatedAt (or null when the model has none) otherwise
 */
async function readTarget(
  prisma: any,
  rule: SyncEntityRule,
  id: string
): Promise<{ state: 'missing' } | { state: 'found'; updatedAt: Date | null; entity: unknown }> {
  const where: any = { id };
  if (rule.softDelete) where.deletedAt = null;
  const row = await prisma[rule.prismaModel].findFirst({ where });
  if (!row) return { state: 'missing' };
  return { state: 'found', updatedAt: rule.hasUpdatedAt && row.updatedAt ? new Date(row.updatedAt) : null, entity: row };
}

router.post('/push', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const prisma = (req as any).prisma;
  if (!user?.id || !user?.companyId || !prisma) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const mutations = req.body?.mutations;
  if (!Array.isArray(mutations) || mutations.length === 0) {
    return res.status(400).json({ success: false, error: 'mutations must be a non-empty array' });
  }
  if (mutations.length > MAX_MUTATIONS_PER_PUSH) {
    return res.status(413).json({ success: false, error: `At most ${MAX_MUTATIONS_PER_PUSH} mutations per push` });
  }

  const authorization = req.headers.authorization;
  if (!authorization) return res.status(401).json({ success: false, error: 'Authentication required' });

  const scope = `${user.companyId}:${user.id}`;
  const port = req.socket.localPort as number;
  const clientIp = req.ip || req.socket.remoteAddress || '';
  const results: PushResult[] = [];
  let blocked = false;
  const deadline = Date.now() + PUSH_TIME_BUDGET_MS;

  for (const raw of mutations) {
    const clientMutationId: string = typeof raw?.clientMutationId === 'string' ? raw.clientMutationId : '';
    if (clientMutationId.length < 8 || clientMutationId.length > 128) {
      results.push({ clientMutationId, status: 'rejected', reason: 'bad_request', message: 'clientMutationId is required' });
      continue;
    }

    // A transient failure earlier in the batch: stop, so queued writes are never applied out of order.
    if (blocked) {
      results.push({ clientMutationId, status: 'retry', reason: 'blocked_by_previous' });
      continue;
    }

    // Replays run one after another; stop well before a reverse proxy / load balancer would cut the request off.
    // The rest come back as retry (no penalty) and the client immediately sends the next batch.
    if (Date.now() > deadline) {
      results.push({ clientMutationId, status: 'retry', reason: 'time_budget', retryAfterMs: 250 });
      blocked = true;
      continue;
    }

    const policy = classifyMutation(raw.method, raw.path);
    if (!policy.ok) {
      results.push({ clientMutationId, status: 'rejected', reason: policy.code, message: policy.message });
      continue;
    }
    const body = validateBody(policy.method, raw.body);
    if (!body.ok) {
      results.push({ clientMutationId, status: 'rejected', reason: 'bad_body', message: body.message });
      continue;
    }

    const prior = await getOutcome(scope, clientMutationId);
    if (prior) {
      results.push({ clientMutationId, status: prior.status, reason: prior.reason, httpStatus: prior.httpStatus, data: prior.data, replayed: true });
      continue;
    }

    if (!(await acquireLock(scope, clientMutationId))) {
      results.push({ clientMutationId, status: 'retry', reason: 'in_progress', retryAfterMs: 2000 });
      blocked = true;
      continue;
    }

    try {
      // Preflight: detect deleted / concurrently modified targets before touching anything.
      if (policy.action !== 'CREATE' && policy.entityId) {
        const target = await readTarget(prisma, policy.rule, policy.entityId);
        if (target.state === 'missing') {
          if (policy.action === 'DELETE') {
            const outcome: StoredOutcome = { status: 'applied', reason: 'already_deleted', httpStatus: 200, data: { deleted: true, id: policy.entityId }, at: Date.now() };
            await saveOutcome(scope, clientMutationId, outcome);
            results.push({ clientMutationId, status: 'applied', reason: outcome.reason, httpStatus: 200, data: outcome.data });
          } else {
            const outcome: StoredOutcome = { status: 'conflict', reason: 'entity_not_found', httpStatus: 404, data: null, at: Date.now() };
            await saveOutcome(scope, clientMutationId, outcome);
            results.push({ clientMutationId, status: 'conflict', reason: 'entity_not_found', httpStatus: 404, message: 'This item was deleted by someone else while you were offline.' });
          }
          continue;
        }

        if (policy.action === 'UPDATE' && !raw.force && target.updatedAt && Number.isFinite(Number(raw.baseUpdatedAt))) {
          // Stale-write guard: the row changed on the server after the user started editing offline.
          // Coarse (row-level) on purpose: never silently overwrite. The user resolves: keep mine (force) / use theirs.
          if (target.updatedAt.getTime() > Number(raw.baseUpdatedAt)) {
            const outcome: StoredOutcome = { status: 'conflict', reason: 'stale_write', httpStatus: 409, data: null, at: Date.now() };
            await saveOutcome(scope, clientMutationId, outcome);
            results.push({ clientMutationId, status: 'conflict', reason: 'stale_write', httpStatus: 409, serverEntity: target.entity, message: 'This item was changed by someone else while you were offline.' });
            continue;
          }
        }
      }

      let rest: { status: number; data: unknown };
      try {
        rest = await callRest({
          port,
          method: policy.method,
          path: policy.path,
          bodyJson: body.json,
          authorization,
          clientIp,
          clientMutationId,
        });
      } catch (err: any) {
        // Network/timeout talking to ourselves: outcome unknown, so do NOT record it. The client will retry and
        // the preflight above keeps a retried DELETE/UPDATE safe; a retried CREATE is protected by its client id.
        console.error(`[SyncPush] replay failed (${policy.method} ${policy.path}):`, err?.message || err);
        results.push({ clientMutationId, status: 'retry', reason: 'server_error' });
        blocked = true;
        continue;
      }

      const mapped = mapHttpStatus(policy.action, rest.status);
      if (mapped.status === 'retry') {
        results.push({ clientMutationId, status: 'retry', reason: mapped.reason, httpStatus: rest.status, retryAfterMs: mapped.reason === 'rate_limited' ? 10_000 : undefined });
        blocked = true;
        continue;
      }

      const outcome: StoredOutcome = { status: mapped.status, reason: mapped.reason, httpStatus: rest.status, data: rest.data, at: Date.now() };
      await saveOutcome(scope, clientMutationId, outcome);
      results.push({
        clientMutationId,
        status: mapped.status,
        reason: mapped.reason,
        httpStatus: rest.status,
        data: rest.data,
        message: mapped.status === 'applied' ? undefined : errorMessage(rest.data),
      });
    } catch (err: any) {
      console.error(`[SyncPush] unexpected error for ${clientMutationId}:`, err?.message || err);
      results.push({ clientMutationId, status: 'retry', reason: 'server_error' });
      blocked = true;
    } finally {
      await releaseLock(scope, clientMutationId);
    }
  }

  return res.status(200).json({ success: true, serverTime: Date.now(), results });
});

// NOTE: the first-generation `POST /sync/batch` and `GET /sync/delta` were removed on purpose. They bypassed REST
// authorization (any employee could create/delete tasks that `requireManager` forbids), ignored tenant scoping and
// acknowledged unsupported entity types without applying them. Old clients that still call /batch get a 404 and fall
// back to replaying each write through its real REST endpoint, which is correctly authorized.

// ─── Pull ─────────────────────────────────────────────────────────────────────

const PULL_DEFAULT_LIMIT = 200;
const PULL_MAX_LIMIT = 500;
const INITIAL_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const DONE_STATUSES = ['done', 'completed', 'cancelled', 'canceled'];

function decodeCursor(raw: unknown): { t: Date; id: string } | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    const t = new Date(parsed.t);
    if (Number.isNaN(t.getTime()) || typeof parsed.id !== 'string') return null;
    return { t, id: parsed.id };
  } catch {
    return null;
  }
}

const encodeCursor = (t: Date, id: string) => Buffer.from(JSON.stringify({ t: t.toISOString(), id })).toString('base64url');

/**
 * GET /sync/pull?entity=task&cursor=<opaque>&limit=200
 *
 * Returns rows the CALLER may see (same visibility as GET /api/tasks), in (updatedAt, id) order so the cursor is
 * stable, plus tombstones for soft-deleted rows. First call (no cursor) returns every open task plus anything
 * touched in the last 90 days, so an open-ended task is never missing from the offline cache just because it is old.
 *
 * Limitation (documented in docs/offline-desktop): a task that is *reassigned away from* the caller stops matching
 * the visibility filter and is not reported as deleted. The client therefore performs a periodic full re-baseline.
 */
router.get('/pull', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const prisma = (req as any).prisma;
  if (!user?.id || !user?.companyId || !prisma) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const entity = String(req.query.entity || 'task');
  if (entity !== 'task') {
    return res.status(400).json({ success: false, error: `Pull is not supported for "${entity}" yet` });
  }

  const limit = Math.min(Math.max(parseInt(String(req.query.limit || PULL_DEFAULT_LIMIT), 10) || PULL_DEFAULT_LIMIT, 1), PULL_MAX_LIMIT);
  const cursor = decodeCursor(req.query.cursor);
  if (req.query.cursor && !cursor) {
    return res.status(400).json({ success: false, error: 'Invalid cursor' });
  }

  const and: any[] = [{ NOT: { project: { projectType: 'social_media' } } }];

  const roles: string[] = user.roles || [user.role || 'employee'];
  const isAdminOrCeo = roles.includes('admin') || roles.includes('ceo') || user.role === 'admin' || user.role === 'ceo';
  if (!isAdminOrCeo) {
    and.push({ OR: [{ assigneeId: user.id }, { creatorId: user.id }] });
  }

  if (cursor) {
    and.push({ OR: [{ updatedAt: { gt: cursor.t } }, { updatedAt: cursor.t, id: { gt: cursor.id } }] });
  } else {
    and.push({
      OR: [{ updatedAt: { gte: new Date(Date.now() - INITIAL_WINDOW_MS) } }, { status: { notIn: DONE_STATUSES }, deletedAt: null }],
    });
  }

  try {
    const rows: any[] = await prisma.task.findMany({
      where: { AND: and },
      include: {
        assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
        creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
        project: { select: { id: true, name: true, status: true } },
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return res.status(200).json({
      success: true,
      serverTime: Date.now(),
      entity,
      upserts: page.filter((r) => !r.deletedAt),
      deletedIds: page.filter((r) => r.deletedAt).map((r) => r.id),
      nextCursor: last ? encodeCursor(new Date(last.updatedAt), last.id) : typeof req.query.cursor === 'string' ? req.query.cursor : null,
      hasMore,
      // Bump when the visibility rules change so clients know to discard their baseline.
      baselineVersion: 1,
    });
  } catch (err: any) {
    console.error('[SyncPull] failed:', err?.message || err);
    return res.status(500).json({ success: false, error: 'Failed to load changes' });
  }
});

export default router;
