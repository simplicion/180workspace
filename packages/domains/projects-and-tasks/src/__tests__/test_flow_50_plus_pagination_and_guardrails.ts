/**
 * Comprehensive 50+ Scenario Test Suite for Keyset Pagination & Prisma Guardrails
 * 
 * Tests boundary conditions, edge cases, keyset mechanics, backward/forward navigation,
 * tampering protection, guardrail auto-capping, bypass mechanisms, and performance.
 */

import {
    encodeCursor,
    decodeCursor,
    extractPaginationParams,
    paginateWithCursor,
    CursorPayload
} from '@workspace/backend-infra';
import {
    applyQueryGuardrails,
    SAFE_QUERY_LIMIT,
    MAX_ALLOWED_TAKE
} from '@workspace/db';

interface TestResult {
    id: number;
    description: string;
    passed: boolean;
    error?: string;
    details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, description: string, details?: string) {
    const id = results.length + 1;
    if (condition) {
        results.push({ id, description, passed: true, details });
        console.log(`  ✓ [TEST ${id}] ${description}`);
    } else {
        results.push({ id, description, passed: false, error: 'Assertion failed', details });
        console.error(`  ✗ [TEST ${id}] ${description} (FAILED)`);
    }
}

async function runSuite() {
    console.log('\n================================================================');
    console.log('🚀 RUNNING 50+ SCENARIO TEST SUITE FOR SCALABILITY ARCHITECTURE');
    console.log('================================================================\n');

    // ---------------------------------------------------------
    // CATEGORY 1: CURSOR ENCODING & TAMPERING PROTECTION (Tests 1 - 9)
    // ---------------------------------------------------------
    console.log('--- Category 1: Cursor Serialization & Resilience ---');

    // 1. encodeCursor produces non-empty string
    const c1 = encodeCursor({ id: 'task-100', sortValue: '2026-09-01T00:00:00.000Z' });
    assert(typeof c1 === 'string' && c1.length > 0, 'encodeCursor produces non-empty URL-safe string');

    // 2. encodeCursor handles unicode and special chars
    const c2 = encodeCursor({ id: 'task-🚀-ü!@#$', sortValue: 123456 });
    const d2 = decodeCursor(c2);
    assert(d2?.id === 'task-🚀-ü!@#$' && d2?.sortValue === 123456, 'encodeCursor preserves unicode and special characters');

    // 3. decodeCursor restores exact payload
    const payload3 = { id: 'item-abc', sortValue: 998877 };
    const decoded3 = decodeCursor(encodeCursor(payload3));
    assert(decoded3?.id === 'item-abc' && decoded3?.sortValue === 998877, 'decodeCursor reconstructs exact original payload');

    // 4. decodeCursor parses ISO date string into real Date object
    const isoDate = '2026-09-04T03:49:49.000Z';
    const decoded4 = decodeCursor(encodeCursor({ id: 'd-1', sortValue: isoDate }));
    assert(decoded4?.sortValue instanceof Date && decoded4.sortValue.toISOString() === isoDate, 'decodeCursor converts ISO string back to Date object');

    // 5. decodeCursor returns null on empty / null / undefined
    assert(decodeCursor('') === null && decodeCursor(null) === null && decodeCursor(undefined) === null, 'decodeCursor returns null for empty or missing inputs');

    // 6. decodeCursor handles malformed base64 gracefully without throwing
    assert(decodeCursor('!!!not-valid-base64-url!@#$%') === null, 'decodeCursor gracefully rejects invalid base64');

    // 7. decodeCursor handles base64 that is not JSON
    const notJsonBase64 = Buffer.from('hello plain text', 'utf8').toString('base64url');
    assert(decodeCursor(notJsonBase64) === null, 'decodeCursor handles valid base64 with non-JSON payload');

    // 8. decodeCursor handles JSON missing the mandatory `id` field
    const noIdBase64 = Buffer.from(JSON.stringify({ sortValue: 123 }), 'utf8').toString('base64url');
    assert(decodeCursor(noIdBase64) === null, 'decodeCursor rejects JSON without mandatory id field');

    // 9. decodeCursor handles primitive JSON values (e.g. number or boolean)
    const primBase64 = Buffer.from(JSON.stringify(42), 'utf8').toString('base64url');
    assert(decodeCursor(primBase64) === null, 'decodeCursor rejects primitive JSON values');

    // ---------------------------------------------------------
    // CATEGORY 2: PARAMETER EXTRACTION & SANITIZATION (Tests 10 - 20)
    // ---------------------------------------------------------
    console.log('\n--- Category 2: Request Query Parameter Parsing ---');

    // 10. extractPaginationParams defaults limit to 20
    const p10 = extractPaginationParams({});
    assert(p10.limit === 20, 'Defaults limit to 20 when omitted');

    // 11. extractPaginationParams parses valid numeric limit
    const p11 = extractPaginationParams({ limit: '45' });
    assert(p11.limit === 45, 'Parses valid string limit to integer');

    // 12. extractPaginationParams sanitizes 0 or negative limits
    const p12 = extractPaginationParams({ limit: '-10' });
    assert(p12.limit === 20, 'Sanitizes negative limit to default 20');

    // 13. extractPaginationParams clamps excessive limits to 100
    const p13 = extractPaginationParams({ limit: '5000' });
    assert(p13.limit === 100, 'Clamps limits > 100 to MAX_PAGE_SIZE (100)');

    // 14. extractPaginationParams parses direction = 'backward'
    const p14 = extractPaginationParams({ direction: 'backward' });
    assert(p14.direction === 'backward', 'Parses backward direction');

    // 15. extractPaginationParams defaults direction to 'forward'
    const p15 = extractPaginationParams({ direction: 'invalid_dir' });
    assert(p15.direction === 'forward', 'Defaults invalid direction to forward');

    // 16. extractPaginationParams parses custom sortField and sortOrder
    const p16 = extractPaginationParams({ sortField: 'priority', sortOrder: 'asc' });
    assert(p16.sortField === 'priority' && p16.sortOrder === 'asc', 'Parses custom sortField and sortOrder');

    // 17. extractPaginationParams defaults sortField to createdAt and sortOrder to desc
    const p17 = extractPaginationParams({});
    assert(p17.sortField === 'createdAt' && p17.sortOrder === 'desc', 'Defaults sortField to createdAt and sortOrder to desc');

    // 18. extractPaginationParams extracts and trims cursor
    const p18 = extractPaginationParams({ cursor: '   valid_cursor_123   ' });
    assert(p18.cursor === 'valid_cursor_123', 'Trims whitespace from cursor');

    // 19. extractPaginationParams handles empty string cursor as null
    const p19 = extractPaginationParams({ cursor: '   ' });
    assert(p19.cursor === null, 'Converts whitespace-only cursor to null');

    // 20. extractPaginationParams parses integer page parameter
    const p20 = extractPaginationParams({ page: '4' });
    assert(p20.page === 4, 'Parses page parameter correctly');

    // ---------------------------------------------------------
    // CATEGORY 3: PRISMA GUARDRAILS AUTO-CAPPING (Tests 21 - 30)
    // ---------------------------------------------------------
    console.log('\n--- Category 3: Centralized Prisma Guardrail Enforcement ---');

    // 21. applyQueryGuardrails ignores non-findMany operations
    const g21 = applyQueryGuardrails('Task', 'findUnique', { where: { id: '1' } });
    assert(g21.take === undefined, 'Does not inject take into findUnique');

    // 22. applyQueryGuardrails ignores findFirst
    const g22 = applyQueryGuardrails('Task', 'findFirst', { where: { id: '1' } });
    assert(g22.take === undefined, 'Does not inject take into findFirst');

    // 23. applyQueryGuardrails auto-caps unbounded findMany when take is missing
    const g23 = applyQueryGuardrails('Task', 'findMany', {});
    assert(g23.take === SAFE_QUERY_LIMIT, `Auto-caps missing take to SAFE_QUERY_LIMIT (${SAFE_QUERY_LIMIT})`);

    // 24. applyQueryGuardrails auto-caps when take is null
    const g24 = applyQueryGuardrails('Task', 'findMany', { take: null });
    assert(g24.take === SAFE_QUERY_LIMIT, 'Auto-caps null take to SAFE_QUERY_LIMIT');

    // 25. applyQueryGuardrails respects user-defined take
    const g25 = applyQueryGuardrails('Task', 'findMany', { take: 15 });
    assert(g25.take === 15, 'Preserves developer-defined take of 15');

    // 26. applyQueryGuardrails clamps excessive take (e.g. 9999) to MAX_ALLOWED_TAKE
    const g26 = applyQueryGuardrails('Task', 'findMany', { take: 9999 });
    assert(g26.take === MAX_ALLOWED_TAKE, `Clamps take > ${MAX_ALLOWED_TAKE} to MAX_ALLOWED_TAKE (${MAX_ALLOWED_TAKE})`);

    // 27. applyQueryGuardrails allows bypass when _bypassGuardrail: true
    const g27 = applyQueryGuardrails('Task', 'findMany', { _bypassGuardrail: true });
    assert(g27.take === undefined, 'Respects _bypassGuardrail flag to allow full uncapped fetch');

    // 28. applyQueryGuardrails deletes _bypassGuardrail from args so Prisma doesn't error
    const g28: any = { _bypassGuardrail: true };
    applyQueryGuardrails('Task', 'findMany', g28);
    assert(g28._bypassGuardrail === undefined, 'Cleans up _bypassGuardrail from args');

    // 29. applyQueryGuardrails allows bypass inside where clause
    const g29: any = { where: { _bypassGuardrail: true } };
    applyQueryGuardrails('Task', 'findMany', g29);
    assert(g29.take === undefined, 'Allows _bypassGuardrail inside where clause');

    // 30. applyQueryGuardrails cleans up where._bypassGuardrail
    const g30: any = { where: { _bypassGuardrail: true, status: 'active' } };
    applyQueryGuardrails('Task', 'findMany', g30);
    assert(g30.where._bypassGuardrail === undefined && g30.where.status === 'active', 'Cleans up where._bypassGuardrail without altering other where filters');

    // ---------------------------------------------------------
    // CATEGORY 4: KEYSET CURSOR PAGINATION MECHANICS (Tests 31 - 45)
    // ---------------------------------------------------------
    console.log('\n--- Category 4: Keyset & Bidirectional Cursor Pagination Mechanics ---');

    // Create a mock model delegate simulating a database table
    const mockDatabase: any[] = [];
    const baseTime = new Date('2026-09-01T00:00:00.000Z').getTime();
    for (let i = 1; i <= 25; i++) {
        mockDatabase.push({
            id: `task-${String(i).padStart(3, '0')}`,
            title: `Task Item ${i}`,
            createdAt: new Date(baseTime + i * 3600000), // Hourly increments
            status: i % 2 === 0 ? 'completed' : 'pending'
        });
    }

    // Helper mock delegate
    const createMockDelegate = (data: any[]) => ({
        findMany: async (args: any) => {
            let filtered = [...data];

            // Handle AND where clauses
            if (args.where?.AND) {
                for (const condition of args.where.AND) {
                    if (condition.status) {
                        filtered = filtered.filter(item => item.status === condition.status);
                    }
                    if (condition.OR) {
                        // Keyset condition
                        const [c1, c2] = condition.OR;
                        const sortField = Object.keys(c1)[0];
                        const operator = Object.keys(c1[sortField])[0];
                        const targetValue = c1[sortField][operator];

                        filtered = filtered.filter(item => {
                            const val = item[sortField] instanceof Date ? item[sortField].getTime() : item[sortField];
                            const target = targetValue instanceof Date ? targetValue.getTime() : targetValue;

                            if (operator === 'lt') {
                                return val < target || (val === target && item.id < c2.id.lt);
                            } else if (operator === 'gt') {
                                return val > target || (val === target && item.id > c2.id.gt);
                            }
                            return true;
                        });
                    }
                }
            } else if (args.where?.status) {
                filtered = filtered.filter(item => item.status === args.where.status);
            }

            // Order By
            if (args.orderBy) {
                const primary = args.orderBy[0];
                const sortField = Object.keys(primary)[0];
                const direction = primary[sortField];

                filtered.sort((a, b) => {
                    const valA = a[sortField] instanceof Date ? a[sortField].getTime() : a[sortField];
                    const valB = b[sortField] instanceof Date ? b[sortField].getTime() : b[sortField];
                    if (valA === valB) {
                        return direction === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
                    }
                    return direction === 'asc' ? valA - valB : valB - valA;
                });
            }

            // Take
            if (args.take) {
                filtered = filtered.slice(0, args.take);
            }

            return filtered;
        },
        count: async (args: any) => {
            if (args?.where?.status) {
                return data.filter(d => d.status === args.where.status).length;
            }
            return data.length;
        }
    });

    const mockDelegate = createMockDelegate(mockDatabase);

    // 31. Empty collection handling
    const emptyDelegate = createMockDelegate([]);
    const res31 = await paginateWithCursor(emptyDelegate, { limit: 10 });
    assert(res31.items.length === 0 && res31.pageInfo.hasNextPage === false && res31.pageInfo.startCursor === null, 'Empty collection returns 0 items and hasNextPage: false');

    // 32. Single-item collection
    const singleDelegate = createMockDelegate([mockDatabase[0]]);
    const res32 = await paginateWithCursor(singleDelegate, { limit: 10 });
    assert(res32.items.length === 1 && res32.pageInfo.hasNextPage === false && res32.pageInfo.startCursor === res32.pageInfo.endCursor, 'Single item returns 1 item with identical start and end cursor');

    // 33. Exactly limit items (boundary condition)
    const exactlyLimitDelegate = createMockDelegate(mockDatabase.slice(0, 5));
    const res33 = await paginateWithCursor(exactlyLimitDelegate, { limit: 5 });
    assert(res33.items.length === 5 && res33.pageInfo.hasNextPage === false, 'Exactly limit items sets hasNextPage: false');

    // 34. Exactly limit + 1 items
    const limitPlusOneDelegate = createMockDelegate(mockDatabase.slice(0, 6));
    const res34 = await paginateWithCursor(limitPlusOneDelegate, { limit: 5 });
    assert(res34.items.length === 5 && res34.pageInfo.hasNextPage === true, 'Limit + 1 items slices to limit and sets hasNextPage: true');

    // 35. Forward traversal: Page 1 fetch
    const page1 = await paginateWithCursor(mockDelegate, { limit: 5, sortField: 'createdAt', sortOrder: 'desc' });
    assert(page1.items.length === 5 && page1.pageInfo.hasNextPage === true && page1.pageInfo.endCursor !== null, 'Page 1 returns 5 items and valid endCursor');

    // 36. Forward traversal: Page 2 fetch using Page 1 endCursor
    const page2 = await paginateWithCursor(mockDelegate, {
        limit: 5,
        cursor: page1.pageInfo.endCursor,
        sortField: 'createdAt',
        sortOrder: 'desc'
    });
    const page1Ids = new Set(page1.items.map(i => i.id));
    const hasOverlap = page2.items.some(i => page1Ids.has(i.id));
    assert(page2.items.length === 5 && !hasOverlap, 'Page 2 items have zero overlap with Page 1');

    // 37. Forward traversal: Reaching the end of data
    let currentCursor = page2.pageInfo.endCursor;
    let finalPage: any;
    for (let p = 3; p <= 5; p++) {
        finalPage = await paginateWithCursor(mockDelegate, {
            limit: 5,
            cursor: currentCursor,
            sortField: 'createdAt',
            sortOrder: 'desc'
        });
        currentCursor = finalPage.pageInfo.endCursor;
    }
    assert(finalPage.pageInfo.hasNextPage === false, 'Last page cleanly sets hasNextPage: false');

    // 38. hasPreviousPage set to true when cursor is provided
    assert(page2.pageInfo.hasPreviousPage === true, 'Subsequent page reports hasPreviousPage: true');

    // 39. Backward traversal: navigating from Page 2 back to Page 1
    const backToPage1 = await paginateWithCursor(mockDelegate, {
        limit: 5,
        cursor: page2.pageInfo.startCursor,
        direction: 'backward',
        sortField: 'createdAt',
        sortOrder: 'desc'
    });
    const expectedPage1FirstId = page1.items[0].id;
    const actualBackFirstId = backToPage1.items[0].id;
    assert(actualBackFirstId === expectedPage1FirstId, 'Backward navigation accurately lands on exact preceding page');

    // 40. Backward traversal sets natural sort order (un-inverted)
    const backTimestamps = backToPage1.items.map(i => i.createdAt.getTime());
    const isSortedDesc = backTimestamps.every((val, idx) => idx === 0 || val <= backTimestamps[idx - 1]);
    assert(isSortedDesc, 'Backward navigation returns items in natural descending order');

    // 41. Duplicate sortField tie-breaking (items with identical timestamps)
    const tiedDatabase = [
        { id: 'task-a', title: 'A', createdAt: new Date(baseTime) },
        { id: 'task-b', title: 'B', createdAt: new Date(baseTime) },
        { id: 'task-c', title: 'C', createdAt: new Date(baseTime) },
        { id: 'task-d', title: 'D', createdAt: new Date(baseTime) }
    ];
    const tiedDelegate = createMockDelegate(tiedDatabase);
    const tiedPage1 = await paginateWithCursor(tiedDelegate, { limit: 2, sortField: 'createdAt', sortOrder: 'desc' });
    const tiedPage2 = await paginateWithCursor(tiedDelegate, { limit: 2, cursor: tiedPage1.pageInfo.endCursor, sortField: 'createdAt', sortOrder: 'desc' });
    assert(tiedPage1.items.length === 2 && tiedPage2.items.length === 2 && tiedPage1.items[1].id !== tiedPage2.items[0].id, 'Tied timestamps cleanly broken by unique ID');

    // 42. Ascending order forward pagination
    const ascPage1 = await paginateWithCursor(mockDelegate, { limit: 5, sortField: 'createdAt', sortOrder: 'asc' });
    const isAscending = ascPage1.items[0].createdAt.getTime() < ascPage1.items[1].createdAt.getTime();
    assert(isAscending, 'Supports ascending keyset sorting order');

    // 43. Ascending order backward pagination
    const ascPage2 = await paginateWithCursor(mockDelegate, { limit: 5, cursor: ascPage1.pageInfo.endCursor, sortField: 'createdAt', sortOrder: 'asc' });
    const ascBackPage1 = await paginateWithCursor(mockDelegate, { limit: 5, cursor: ascPage2.pageInfo.startCursor, direction: 'backward', sortField: 'createdAt', sortOrder: 'asc' });
    assert(ascBackPage1.items[0].id === ascPage1.items[0].id, 'Supports ascending backward keyset traversal');

    // 44. Query with additional WHERE filters
    const filteredRes = await paginateWithCursor(mockDelegate, {
        where: { status: 'completed' },
        limit: 5
    });
    const allCompleted = filteredRes.items.every(i => i.status === 'completed');
    assert(allCompleted, 'Preserves caller where filters combined with keyset cursor');

    // 45. Total count inclusion toggle
    const countRes = await paginateWithCursor(mockDelegate, { limit: 5, includeTotalCount: true });
    assert(countRes.pageInfo.totalCount === 25, 'Calculates totalCount when includeTotalCount: true');

    // ---------------------------------------------------------
    // CATEGORY 5: PERFORMANCE & HIGH-LOAD BENCHMARKS (Tests 46 - 52)
    // ---------------------------------------------------------
    console.log('\n--- Category 5: Concurrency, Performance & Edge Stress ---');

    // 46. Omit totalCount skips count query
    const fastRes = await paginateWithCursor(mockDelegate, { limit: 5, includeTotalCount: false });
    assert(fastRes.pageInfo.totalCount === undefined, 'Skips count() query when includeTotalCount is false for peak performance');

    // 47. Rapid sequential pagination latency benchmark (< 50ms total for 20 pages)
    const t0 = Date.now();
    let benchCursor: any = null;
    for (let b = 0; b < 10; b++) {
        const p = await paginateWithCursor(mockDelegate, { limit: 2, cursor: benchCursor });
        benchCursor = p.pageInfo.endCursor;
    }
    const benchTime = Date.now() - t0;
    assert(benchTime < 100, `10 sequential cursor iterations execute in ${benchTime}ms (< 100ms)`);

    // 48. Concurrent parallel pagination queries
    const parallelPromises = Array.from({ length: 10 }).map((_, idx) =>
        paginateWithCursor(mockDelegate, { limit: 3 })
    );
    const parallelResults = await Promise.all(parallelPromises);
    const allPassedParallel = parallelResults.every(r => r.items.length === 3);
    assert(allPassedParallel, '10 simultaneous parallel pagination calls execute cleanly without race conditions');

    // 49. Corrupted base64 cursor does not crash (falls back to page 1)
    const corruptedRes = await paginateWithCursor(mockDelegate, { cursor: 'totally_invalid_cursor_string!!!', limit: 5 });
    assert(corruptedRes.items.length === 5, 'Gracefully degrades to page 1 on corrupted cursor string');

    // 50. Large limit clamping in paginateWithCursor
    const clampedRes = await paginateWithCursor(mockDelegate, { limit: 10000 });
    assert(clampedRes.items.length <= 100, 'Clamps limit to 100 inside paginateWithCursor');

    // 51. Keyset pagination stability during concurrent insertions
    const mutatedDatabase = [...mockDatabase];
    const initialPage = await paginateWithCursor(createMockDelegate(mutatedDatabase), { limit: 5, sortField: 'createdAt', sortOrder: 'desc' });
    
    // Simulate concurrent insert of an older item (before cursor)
    mutatedDatabase.push({
        id: 'task-new-historical',
        title: 'Historical Task',
        createdAt: new Date(baseTime - 100000),
        status: 'pending'
    });

    const nextPageAfterInsert = await paginateWithCursor(createMockDelegate(mutatedDatabase), {
        limit: 5,
        cursor: initialPage.pageInfo.endCursor,
        sortField: 'createdAt',
        sortOrder: 'desc'
    });
    const noDupes = nextPageAfterInsert.items.every(item => !initialPage.items.some(i => i.id === item.id));
    assert(noDupes, 'Keyset pagination remains 100% duplicate-free despite concurrent insertions');

    // 52. Multi-tenant isolation integrity without cursor
    const tenantFilter = { companyId: 'company-abc' };
    const tenantDelegate = {
        findMany: async (args: any) => {
            const hasCompanyId = args.where?.companyId === 'company-abc' || (args.where?.AND && args.where.AND.some((c: any) => c.companyId === 'company-abc'));
            return hasCompanyId ? [mockDatabase[0]] : [];
        }
    };
    const tenantResultWithoutCursor = await paginateWithCursor(tenantDelegate as any, { where: tenantFilter });
    assert(tenantResultWithoutCursor.items.length === 1, 'Preserves companyId RLS where clause when cursor is omitted');

    // 53. Multi-tenant isolation integrity with keyset cursor
    const tenantResultWithCursor = await paginateWithCursor(tenantDelegate as any, {
        where: tenantFilter,
        cursor: initialPage.pageInfo.endCursor
    });
    assert(tenantResultWithCursor.items.length === 1, 'Preserves companyId RLS inside compound AND when keyset cursor is active');

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log('\n================================================================');
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;
    console.log(`TOTAL SCENARIOS TESTED: ${results.length}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${failedCount}`);
    console.log('================================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    } else {
        console.log('🎉 ALL 52 TEST SCENARIOS PASSED WITH ZERO REGRESSIONS!\n');
    }
}

runSuite().catch(err => {
    console.error('Test suite runner crashed:', err);
    process.exit(1);
});
