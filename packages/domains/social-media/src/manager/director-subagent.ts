import { prisma } from '@workspace/db';
import { extractPreferences } from '../agent-os/agent-memory';
import { requireCompanyId } from '../tenant-scope';

export class DirectorSubagent {
    /**
     * Retrieves current editing rules and director preferences for the project.
     */
    static async getDirectorPreferences(companyId: string, projectId: string) {
        requireCompanyId(companyId);
        const memories = await (prisma as any).agentMemory.findMany({
            where: {
                companyId,
                projectId,
                kind: 'preference',
            },
            orderBy: { updatedAt: 'desc' },
        });

        return {
            projectId,
            activeRulesCount: memories.length,
            preferences: memories.map((m: any) => ({
                key: m.key,
                rule: m.text,
                updatedAt: m.updatedAt,
            })),
        };
    }

    /**
     * Applies a new editing rule or preference commanded by the user / 180 Manager.
     */
    static async applyEditingRule(companyId: string, projectId: string, ruleInstruction: string) {
        requireCompanyId(companyId);
        const extracted = extractPreferences(ruleInstruction);

        const updated: any[] = [];
        for (const pref of extracted) {
            const row = await (prisma as any).agentMemory.upsert({
                where: {
                    companyId_projectId_key: {
                        companyId,
                        projectId,
                        key: pref.key,
                    },
                },
                update: {
                    text: pref.text,
                    payload: { value: pref.value, source: '180_manager' },
                    updatedAt: new Date(),
                },
                create: {
                    companyId,
                    projectId,
                    kind: 'preference',
                    scope: 'director',
                    key: pref.key,
                    text: pref.text,
                    payload: { value: pref.value, source: '180_manager' },
                },
            }).catch(async () => {
                // Fallback if composite index isn't unique in legacy tables
                return (prisma as any).agentMemory.create({
                    data: {
                        companyId,
                        projectId,
                        kind: 'preference',
                        scope: 'director',
                        key: pref.key,
                        text: pref.text,
                        payload: { value: pref.value, source: '180_manager' },
                    },
                });
            });
            updated.push(row);
        }

        return {
            success: true,
            rulesApplied: extracted.map((e) => e.text),
            count: updated.length,
        };
    }
}
