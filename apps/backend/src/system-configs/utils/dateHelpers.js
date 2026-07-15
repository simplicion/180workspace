'use strict';

/**
 * Simple date helpers â€” no heavy dependencies needed
 */

/**
 * Get current date as YYYY-MM-DD
 */
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Get current month as YYYY-MM
 */
function thisMonthStr() {
    return new Date().toISOString().slice(0, 7);
}

/**
 * Format a date to YYYY-MM-DD
 */
function toDateStr(date) {
    return new Date(date).toISOString().slice(0, 10);
}

/**
 * Get start of month ISO string
 */
function startOfMonth(yearMonth) {
    return new Date(`${yearMonth}-01T00:00:00.000Z`);
}

/**
 * Get end of month ISO string
 */
function endOfMonth(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

/**
 * Simple format helper (subset of date-fns format)
 */
function format(date, formatStr) {
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
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get formatted month name
 */
function getMonthName(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

module.exports = { 
    todayStr, 
    thisMonthStr, 
    toDateStr, 
    startOfMonth, 
    endOfMonth, 
    format,
    getWeekNumber,
    getMonthName
};
