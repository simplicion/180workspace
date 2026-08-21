/**
 * Simple date helpers — no heavy dependencies needed
 */

/**
 * Get current date as YYYY-MM-DD
 */
export function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Get current month as YYYY-MM
 */
export function thisMonthStr(): string {
    return new Date().toISOString().slice(0, 7);
}

/**
 * Format a date to YYYY-MM-DD
 */
export function toDateStr(date: string | Date | number): string {
    return new Date(date).toISOString().slice(0, 10);
}

/**
 * Get start of month ISO string
 */
export function startOfMonth(yearMonth: string): Date {
    return new Date(`${yearMonth}-01T00:00:00.000Z`);
}

/**
 * Get end of month ISO string
 */
export function endOfMonth(yearMonth: string): Date {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

/**
 * Simple format helper (subset of date-fns format)
 */
export function format(date: string | Date | number, formatStr: string): string {
    const d = new Date(date);
    if (formatStr === 'MMM dd') {
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }
    if (formatStr === 'yyyy-Www') {
        // Manual week implementation if needed, but we mostly use getWeekNumber helper
        return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`; 
    }
    return d.toISOString().split('T')[0];
}

/**
 * Get the ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}

/**
 * Get formatted month name
 */
export function getMonthName(date: string | Date | number): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
