import type { ZodType } from 'zod';
import { jsonrepair } from 'jsonrepair';
import { AgentRole, AutopilotError, AutopilotLLM, UsageMeter } from './llm';

export interface JsonAgentCall<T> {
    llm: AutopilotLLM;
    role: AgentRole;
    system: string;
    prompt: string;
    schema: ZodType<T>;
    maxTokens: number;
    meter?: UsageMeter;
    /** Optional hook to normalize/repair raw data before schema validation. */
    normalize?: (raw: any) => any;
    /** Extra semantic checks after schema validation; return a list of problems (empty = ok). */
    check?: (value: T) => string[];
    log?: (event: string, data: Record<string, unknown>) => void;
}

export interface JsonAgentResult<T> {
    value: T;
    repaired: boolean;
}

/** Pulls and repairs the first JSON object/array out of a model reply (tolerates ```json fences, trailing commas, truncated outputs, and leading prose). */
export function extractJson(text: string): unknown {
    const trimmed = (text || '').trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : trimmed;

    // Fast-path: direct parse
    try {
        return JSON.parse(candidate);
    } catch {
        // Fall through
    }

    // Isolate JSON starting from first [ or {
    let jsonTarget = candidate;
    const firstBracket = candidate.search(/[[{]/);
    if (firstBracket !== -1 && !candidate.startsWith('{') && !candidate.startsWith('[')) {
        jsonTarget = candidate.slice(firstBracket);
    }

    // Try direct parse of targeted JSON
    try {
        return JSON.parse(jsonTarget);
    } catch {
        // Fall through
    }

    // Try jsonrepair on jsonTarget
    try {
        const repaired = jsonrepair(jsonTarget);
        return JSON.parse(repaired);
    } catch {
        // Fall through
    }

    // Handle unterminated / truncated JSON
    const start = jsonTarget.search(/[[{]/);
    if (start === -1) throw new Error('no JSON found in reply');
    const open = jsonTarget[start];
    const close = open === '{' ? '}' : ']';
    const end = jsonTarget.lastIndexOf(close);
    if (end > start) {
        const sliced = jsonTarget.slice(start, end + 1);
        try {
            return JSON.parse(sliced);
        } catch {
            try {
                return JSON.parse(jsonrepair(sliced));
            } catch {
                // fall through
            }
        }
    }

    // If sliced to last safe boundary (closing brace or comma of array item)
    const lastComma = jsonTarget.lastIndexOf(',');
    const lastBrace = jsonTarget.lastIndexOf('}');
    const cutPoint = Math.max(lastComma, lastBrace);
    if (cutPoint > 0) {
        try {
            const cut = jsonTarget.slice(0, cutPoint + (cutPoint === lastBrace ? 1 : 0));
            return JSON.parse(jsonrepair(cut));
        } catch {
            // fall through
        }
    }

    throw new Error('unterminated JSON in reply');
}

function validate<T>(
    text: string,
    schema: ZodType<T>,
    check?: (v: T) => string[],
    normalize?: (raw: any) => any,
): { ok: true; value: T } | { ok: false; errors: string[] } {
    let raw: unknown;
    try {
        raw = extractJson(text);
    } catch (e: any) {
        return { ok: false, errors: [`Reply was not valid JSON: ${e?.message || e}`] };
    }

    if (normalize) {
        try {
            raw = normalize(raw);
        } catch (normErr: any) {
            // If normalization fails, proceed with raw to let zod provide path errors
        }
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
    const v1 = validate(first.text, call.schema, call.check, call.normalize);
    if (v1.ok === true) return { value: (v1 as { value: T }).value, repaired: false };
    const errors1 = (v1 as { errors: string[] }).errors;

    call.log?.('agent_repair', { role: call.role, errors: errors1 });
    const repairPrompt = [
        call.prompt,
        '',
        'YOUR PREVIOUS REPLY WAS REJECTED. Specific errors:',
        ...errors1.map((e) => `- ${e}`),
        '',
        'Return the corrected, complete JSON only. No prose, no markdown fences.',
    ].join('\n');
    const second = await call.llm.complete({ role: call.role, system: call.system, prompt: repairPrompt, maxTokens: call.maxTokens });
    call.meter?.record(call.role, second.usage);
    const v2 = validate(second.text, call.schema, call.check, call.normalize);
    if (v2.ok === true) return { value: (v2 as { value: T }).value, repaired: true };

    throw new AutopilotError('AI_INVALID_OUTPUT', `The ${call.role} agent returned invalid output twice`, { errors: (v2 as { errors: string[] }).errors });
}
