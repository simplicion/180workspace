/**
 * Autopilot usage report: what calendar runs actually consumed, per agent, read from the usage each run stored on
 * its calendar (`metadata.autopilot.usage`). Read-only.
 *
 *   npx tsx apps/backend/scripts/autopilot-usage-report.ts [--company <id>] [--days 30] [--json]
 *
 * Token counts are the pipeline's own meter (estimated from text length unless the provider reported them). Money
 * is shown only when AUTOPILOT_PRICE_INPUT_PER_MTOK_USD and AUTOPILOT_PRICE_OUTPUT_PER_MTOK_USD are set.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function arg(name: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
    const { prisma } = await import('@workspace/db');
    const { priceUsage } = await import('@workspace/ai/content/autopilot');
    const companyId = arg('company');
    const days = Number(arg('days')) || 30;
    const since = new Date(Date.now() - days * 86_400_000);
    const calendars = await (prisma as any).contentCalendar.findMany({
        where: { ...(companyId ? { companyId } : {}), createdAt: { gte: since } },
        select: { id: true, companyId: true, totalPieces: true, metadata: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
    });
    const runs = calendars
        .map((c: any) => ({ c, a: (typeof c.metadata === 'string' ? JSON.parse(c.metadata || '{}') : c.metadata || {}).autopilot }))
        .filter((x: any) => x.a?.status === 'completed' && x.a?.usage);
    if (!runs.length) {
        console.log(`No completed autopilot runs with stored usage in the last ${days} days${companyId ? ` for company ${companyId}` : ''}.`);
        return;
    }
    const byRole: Record<string, { calls: number; inputTokens: number; outputTokens: number }> = {};
    let pieces = 0;
    const total = { calls: 0, inputTokens: 0, outputTokens: 0 };
    for (const { c, a } of runs) {
        pieces += a.totalPieces || c.totalPieces || 0;
        for (const [role, u] of Object.entries<any>(a.usage.byRole || {})) {
            const r = (byRole[role] ||= { calls: 0, inputTokens: 0, outputTokens: 0 });
            r.calls += u.calls; r.inputTokens += u.inputTokens; r.outputTokens += u.outputTokens;
        }
        total.calls += a.usage.calls; total.inputTokens += a.usage.inputTokens; total.outputTokens += a.usage.outputTokens;
    }
    const perRun = (n: number) => Math.round(n / runs.length);
    const report = {
        runs: runs.length,
        pieces,
        perRun: { calls: perRun(total.calls), inputTokens: perRun(total.inputTokens), outputTokens: perRun(total.outputTokens) },
        perPiece: pieces ? { inputTokens: Math.round(total.inputTokens / pieces), outputTokens: Math.round(total.outputTokens / pieces) } : null,
        byAgentPerRun: Object.fromEntries(Object.entries(byRole).map(([role, u]) => [role, { calls: +(u.calls / runs.length).toFixed(1), inputTokens: perRun(u.inputTokens), outputTokens: perRun(u.outputTokens) }])),
        costPerRun: priceUsage({ inputTokens: perRun(total.inputTokens), outputTokens: perRun(total.outputTokens), estimated: true }),
    };
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }
    console.log(`Autopilot usage, last ${days} days: ${report.runs} runs, ${report.pieces} pieces`);
    console.log(`Per run: ${report.perRun.calls} calls, ${report.perRun.inputTokens} input tokens, ${report.perRun.outputTokens} output tokens`);
    console.table(report.byAgentPerRun);
    console.log(report.costPerRun ? `Cost per run at the configured prices: $${report.costPerRun.totalUsd}` : 'Set AUTOPILOT_PRICE_INPUT_PER_MTOK_USD and AUTOPILOT_PRICE_OUTPUT_PER_MTOK_USD to see cost.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
