import { Country } from 'country-state-city';

export interface LocationResult {
    display_name: string;
    lat: string;
    lon: string;
    address: {
        city?: string;
        state?: string;
        country?: string;
        country_code?: string;
    };
}

export interface FormattedLocation {
    address: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    currencyCode: string;
    currencySymbol: string;
}

class LocationService {
    /**
     * Get currency symbol using native Intl API
     */
    getCurrencySymbol(currencyCode: string): string {
        try {
            return (0).toLocaleString('en-US', {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).replace(/\d/g, '').trim();
        } catch (e) {
            return currencyCode;
        }
    }

    /**
     * Search for locations using OpenStreetMap Nominatim API
     */
    async searchLocation(query: string): Promise<LocationResult[]> {
        if (!query || query.trim().length < 3) return [];
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`, {
                headers: {
                    'Accept-Language': 'en-US,en;q=0.9',
                    // Nominatim requires a user agent or they might block requests
                    'User-Agent': 'BMSPCrm/1.0'
                }
            });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error("Location search failed:", e);
            return [];
        }
    }

    /**
     * Parse the raw Nominatim result into a clean format with currency mapping
     */
    parseLocationResult(result: LocationResult): FormattedLocation {
        const addr = result.address;
        const countryCode = (addr.country_code || '').toUpperCase();
        
        let currencyCode = 'USD';
        let currencySymbol = '$';

        if (countryCode) {
            const countryData = Country.getCountryByCode(countryCode);
            if (countryData?.currency) {
                currencyCode = countryData.currency;
                currencySymbol = this.getCurrencySymbol(currencyCode);
            }
        }

        return {
            address: result.display_name,
            city: addr.city || '',
            state: addr.state || '',
            country: addr.country || '',
            countryCode,
            currencyCode,
            currencySymbol
        };
    }

    /**
     * Automatically detect user's country based on IP
     */
    async getCurrentLocation(): Promise<FormattedLocation | null> {
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (!res.ok) return null;
            const data = await res.json();
            
            if (data.country_code) {
                const currencyCode = data.currency || 'USD';
                return {
                    address: `${data.city ? data.city + ', ' : ''}${data.region ? data.region + ', ' : ''}${data.country_name || ''}`,
                    city: data.city || '',
                    state: data.region || '',
                    country: data.country_name || '',
                    countryCode: data.country_code,
                    currencyCode,
                    currencySymbol: this.getCurrencySymbol(currencyCode)
                };
            }
            return null;
        } catch (e) {
            console.error("IP Geolocation failed:", e);
            return null;
        }
    }
}

export const locationService = new LocationService();
