/**
 * Centralized Configuration for the 180workspace
 */

export const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

export const isLocalhost = (hostname: string) => {
    return hostname.includes('localhost') || hostname.includes('127.0.0.1');
};

/**
 * Extracts the base domain from a hostname.
 * Example: 'sub.localhost:3000' -> 'localhost'
 * Example: 'sub.ims.com' -> 'ims.com'
 */
export const getBaseDomain = (hostname: string) => {
    const parts = hostname.split(':')[0].split('.');
    if (isLocalhost(hostname)) {
        return 'localhost';
    }
    if (parts.length >= 2) {
        return parts.slice(-2).join('.');
    }
    return hostname;
};

export const getProtocol = (hostname: string) => {
    return isLocalhost(hostname) ? 'http' : 'https';
};

export const getMainUrl = (hostname: string) => {
    return `${getProtocol(hostname)}://${MAIN_DOMAIN}`;
};
