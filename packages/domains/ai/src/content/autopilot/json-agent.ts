/**
 * Runs one agent call that must return JSON matching a zod schema.
 * On a parse or validation failure the agent gets exactly one repair attempt that includes the errors;
 * a second failure raises AI_INVALID_OUTPUT (the job fails; nothing canned is substituted).
 */
import type { ZodType } from 'zod';
import { AgentRole, AutopilotError, AutopilotLLM, UsageMeter } from './llm';

export interface JsonAgentCall<T> {
    llm: AutopilotLLM;
    role: AgentRole;
    system: string;
    prompt: string;
    schema: ZodType<T>;
    maxTokens: number;
    meter?: UsageMeter;
    /** Extra semantic checks after schema validation; return a list of problems (empty = ok). */
    check?: (value: T) => string[];
    log?: (event: string, data: Record<string, unknown>) => void;
}

export interface JsonAgentResult<T> {
    value: T;
    repaired: boolean;
}

/** Pulls the first JSON object/array out of a model reply (tolerates ```json fences and leading prose). */
export function extractJson(text: string): unknown {
    const trimmed = (text || '').trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : trimmed;
    try {
        return JSON.parse(candidate);
    } catch {
        const start = candidate.search(/[[{]/);
        if (start === -1) throw new Error('no JSON found in reply');
        const open = candidate[start];
        const close = open === '{' ? '}' : ']';
        const end = candidate.lastIndexOf(close);
        if (end <= start) throw new Error('unterminated JSON in reply');
        return JSON.parse(candidate.slice(start, end + 1));
    }
}

function validate<T>(text: string, schema: ZodType<T>, check?: (v: T) => string[]): { ok: true; value: T } | { ok: false; errors: string[] } {
    let raw: unknown;
    try {
        raw = extractJson(text);
    } catch (e: any) {
        return { ok: false, errors: [`Reply was not valid JSON: ${e?.message || e}`] };
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        const errors = parsed.error.issues.slice(0, 20).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
        return { ok: false, errors };
    }
    const problems = check ? check(parsed.data) : [];
    if (problems.length) return { ok: false, errors: problems.slice(0, 20) };
    return { ok: true, value: parsed.data };
}

export async function runJsonAgent<T>(call: JsonAgentCall<T>): Promise<JsonAgentResult<T>> {
    const first = await call.llm.complete({ role: call.role, system: call.system, prompt: call.prompt, maxTokens: call.maxTokens });
    call.meter?.record(call.role, first.usage);
    const v1 = validate(first.text, call.schema, call.check);
    if (v1.ok === true) return { value: (v1 as { value: T }).value, repaired: false };
    const errors1 = (v1 as { errors: string[] }).errors;

    call.log?.('agent_repair', { role: call.role, errors: errors1 });
    const repairPrompt = [
        call.prompt,
        '',
        'YOUR PREVIOUS REPLY WAS REJECTED. Problems:',
        ...errors1.map((e) => `- ${e}`),
        '',
        'Previous reply (truncated):',
        first.text.slice(0, 4000),
        '',
        'Return the corrected, complete JSON only. No prose, no markdown fences.',
    ].join('\n');
    const second = await call.llm.complete({ role: call.role, system: call.system, prompt: repairPrompt, maxTokens: call.maxTokens });
    call.meter?.record(call.role, second.usage);
    const v2 = validate(second.text, call.schema, call.check);
    if (v2.ok === true) return { value: (v2 as { value: T }).value, repaired: true };

    throw new AutopilotError('AI_INVALID_OUTPUT', `The ${call.role} agent returned invalid output twice`, { errors: (v2 as { errors: string[] }).errors });
}
