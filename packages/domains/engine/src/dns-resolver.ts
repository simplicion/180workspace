import * as dns from 'dns';

/**
 * Resolves a mongodb+srv:// URI into a standard mongodb:// URI by manually resolving SRV records.
 * This solves DNS SRV resolution failures in restricted networks.
 */
export async function resolveSrvUri(uri: string): Promise<string> {
    if (!uri || !uri.startsWith('mongodb+srv://')) return uri;

    try {
        console.log('Resolving SRV record manually for:', uri.split('@')[1] || uri);
        
        // Basic parsing of the URI
        const protocolPart = uri.split('://')[1];
        const [credentialsPart, rest] = protocolPart.split('@');
        
        let hostPart = rest;
        let queryPart = '';
        if (rest.includes('?')) {
            const parts = rest.split('?');
            hostPart = parts[0];
            queryPart = parts.slice(1).join('?');
        }
        
        const clusterParts = hostPart.split('/');
        const clusterHostname = clusterParts[0];
        const dbName = clusterParts.length > 1 ? clusterParts[1] : '';
        
        const srvName = `_mongodb._tcp.${clusterHostname}`;
        
        // Try local DNS first
        let srvRecords: dns.SrvRecord[];
        try {
            srvRecords = await dns.promises.resolveSrv(srvName);
        } catch (localErr) {
            console.warn(`Local SRV resolution failed for ${srvName}, trying Google DNS (8.8.8.8)...`);
            const resolver = new dns.promises.Resolver();
            resolver.setServers(['8.8.8.8']);
            srvRecords = await resolver.resolveSrv(srvName);
        }

        if (!srvRecords || srvRecords.length === 0) {
            throw new Error(`Could not find any SRV records for ${clusterHostname}`);
        }

        const nodes = srvRecords.map(addr => `${addr.name}:${addr.port}`).join(',');
        
        // Try to get TXT records for options (replicaSet etc)
        let txtOptions = '';
        try {
            const txtRecords = await dns.promises.resolveTxt(clusterHostname);
            if (txtRecords && txtRecords.length > 0) {
                txtOptions = txtRecords.flat().join('&');
            }
        } catch (txtErr) {
            // Ignore TXT errors
        }

        let finalQueryArr = (queryPart || '').split('&').filter(p => p);
        if (txtOptions) {
            finalQueryArr.push(...txtOptions.split('&'));
        }
        
        // --- ATLAS SPECIFIC DEFAULTS ---
        // If it's Atlas (mongodb.net), we MUST have ssl=true and authSource=admin
        if (clusterHostname.endsWith('mongodb.net')) {
            if (!finalQueryArr.some(p => p.startsWith('ssl='))) finalQueryArr.push('ssl=true');
            if (!finalQueryArr.some(p => p.startsWith('authSource='))) finalQueryArr.push('authSource=admin');
            if (!finalQueryArr.some(p => p.startsWith('retryWrites='))) finalQueryArr.push('retryWrites=true');
        }

        const finalQuery = finalQueryArr.join('&');
        const finalUri = `mongodb://${credentialsPart}@${nodes}/${dbName}${finalQuery ? '?' + finalQuery : ''}`;
        console.log('Successfully resolved SRV to Standard URI:', finalUri.replace(/:[^@]*@/, ':****@'));
        return finalUri;
    } catch (err: any) {
        console.error('Manual SRV Resolution failed:', err.message);
        return uri; // Return original if bypass fails
    }
}
