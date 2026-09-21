import { canQueryTasksLocally, filterAndSortTasks, toRestTask } from '../../../lib/offline/local-queries';

const task = (o: any) => ({ id: o.id, title: o.id, status: 'todo', priority: 'medium', createdAt: '2026-09-01T00:00:00Z', deletedAt: null, ...o });

describe('toRestTask', () => {
  it('folds the project relation into projectId, exactly like the REST layer', () => {
    const out = toRestTask({ id: 't1', projectId: 'p1', project: { id: 'p1', name: 'Alpha', status: 'active' } });
    expect(out.projectId).toEqual({ id: 'p1', name: 'Alpha', status: 'active' });
    expect(out.project).toBeUndefined();
  });
  it('leaves rows without a loaded project untouched', () => {
    expect(toRestTask({ id: 't1', projectId: 'p1' })).toEqual({ id: 't1', projectId: 'p1' });
    expect(toRestTask(null)).toBeNull();
  });
});

describe('canQueryTasksLocally', () => {
  it('only allows filters we can reproduce exactly', () => {
    expect(canQueryTasksLocally({ status: 'todo', page: 1, limit: 10 })).toBe(true);
    expect(canQueryTasksLocally({ assigneeId: '', status: undefined })).toBe(true);
    expect(canQueryTasksLocally({ startDate: '2026-01-01' })).toBe(false);
    expect(canQueryTasksLocally({ cursor: 'abc' })).toBe(false);
    expect(canQueryTasksLocally({ sortField: 'title' })).toBe(false);
    expect(canQueryTasksLocally(undefined)).toBe(true);
  });
});

describe('filterAndSortTasks', () => {
  const rows = [
    task({ id: 'a', dueDate: '2026-09-10T00:00:00Z', status: 'todo', assigneeId: 'u1' }),
    task({ id: 'b', dueDate: '2026-09-05T00:00:00Z', status: 'done', assigneeId: 'u1' }),
    task({ id: 'c', dueDate: null, createdAt: '2026-09-03T00:00:00Z', assigneeId: 'u2' }),
    task({ id: 'd', dueDate: null, createdAt: '2026-09-09T00:00:00Z', assigneeId: { id: 'u1' } }),
    task({ id: 'e', deletedAt: '2026-09-02T00:00:00Z' }),
  ];

  it('sorts by dueDate asc with nulls last, then createdAt desc, and hides soft-deleted rows', () => {
    expect(filterAndSortTasks(rows).tasks.map((t) => t.id)).toEqual(['b', 'a', 'd', 'c']);
  });

  it('filters by scalar or relation-shaped ids', () => {
    expect(filterAndSortTasks(rows, { assigneeId: 'u1' }).tasks.map((t) => t.id)).toEqual(['b', 'a', 'd']);
    expect(filterAndSortTasks(rows, { status: 'done' }).tasks.map((t) => t.id)).toEqual(['b']);
  });

  it('paginates and reports the unpaginated total', () => {
    const res = filterAndSortTasks(rows, { limit: 2, page: 2 });
    expect(res.total).toBe(4);
    expect(res.tasks.map((t) => t.id)).toEqual(['d', 'c']);
  });
});
