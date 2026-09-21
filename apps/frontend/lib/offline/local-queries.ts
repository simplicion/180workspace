/**
 * Answers `GET /api/tasks` from the local entity store when there is no connection, including tasks created or
 * edited offline (they live in the same store as `pending_sync` rows), so lists never "lose" a just-saved item.
 *
 * Deliberately conservative: only the filters we can reproduce exactly are supported. Anything else (date ranges,
 * cursor pagination, custom sort, search) falls back to the HTTP cache for that exact URL, or fails visibly — an
 * offline list that silently ignores a filter would be worse than an error.
 */

import { getLocalEntityRecordsByType } from './outbox';

const SUPPORTED_PARAMS = new Set(['projectId', 'assigneeId', 'moduleId', 'status', 'priority', 'clientId', 'page', 'limit']);

export function canQueryTasksLocally(params: Record<string, any> | null | undefined): boolean {
  if (!params) return true;
  return Object.entries(params).every(([k, v]) => v === undefined || v === null || v === '' || SUPPORTED_PARAMS.has(k));
}

/** REST returns `projectId` as `{id,name,status}` when the project relation is loaded; keep that shape everywhere. */
export function toRestTask(row: any): any {
  if (!row) return row;
  const { project, ...rest } = row;
  if (project && typeof project === 'object' && (typeof row.projectId === 'string' || row.projectId == null)) {
    return { ...rest, projectId: { id: row.projectId ?? project.id, name: project.name, status: project.status } };
  }
  return rest;
}

const idOf = (v: any): string | undefined => (v && typeof v === 'object' ? v.id : v ?? undefined);

export function filterAndSortTasks(tasks: any[], params: Record<string, any> = {}): { tasks: any[]; total: number } {
  const want = (k: string) => (params[k] === undefined || params[k] === null || params[k] === '' ? undefined : String(params[k]));
  const projectId = want('projectId');
  const assigneeId = want('assigneeId');
  const moduleId = want('moduleId');
  const status = want('status');
  const priority = want('priority');
  const clientId = want('clientId');

  const filtered = tasks.filter((t) => {
    if (t.deletedAt) return false;
    if (projectId && idOf(t.projectId) !== projectId) return false;
    if (assigneeId && idOf(t.assigneeId) !== assigneeId) return false;
    if (moduleId && idOf(t.moduleId) !== moduleId) return false;
    if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    if (clientId && idOf(t.clientId) !== clientId) return false;
    return true;
  });

  // Same order as the REST default: dueDate asc (nulls last), then createdAt desc.
  filtered.sort((a, b) => {
    const ad = a.dueDate ? Date.parse(a.dueDate) : Infinity;
    const bd = b.dueDate ? Date.parse(b.dueDate) : Infinity;
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  });

  const limit = Math.max(1, Number(params.limit) || 200);
  const page = Math.max(1, Number(params.page) || 1);
  return { tasks: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
}

/** Returns null when nothing has been synced locally yet, so the caller can fall back to the HTTP cache. */
export async function queryTasksLocally(params: Record<string, any> | null | undefined): Promise<{ tasks: any[]; total: number } | null> {
  if (!canQueryTasksLocally(params)) return null;
  const records = await getLocalEntityRecordsByType('task');
  if (records.length === 0) return null;
  return filterAndSortTasks(records.map((r) => r.data), params || {});
}
