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
     * Detect country from browser timezone using the country-state-city library.
     * Country.getAllCountries() provides timezone data for every country — no hardcoding needed.
     */
    private detectFromTimezone(): FormattedLocation | null {
        try {
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (!browserTimezone) return null;

            const allCountries = Country.getAllCountries();

            // Search all countries for a matching timezone
            for (const country of allCountries) {
                const timezones = (country as any).timezones as Array<{ zoneName: string }> | undefined;
                if (!timezones?.length) continue;

                const match = timezones.some(
                    (tz) => tz.zoneName === browserTimezone
                );

                if (match) {
                    const currencyCode = country.currency || 'USD';
                    return {
                        address: country.name,
                        city: '',
                        state: '',
                        country: country.name,
                        countryCode: country.isoCode,
                        currencyCode,
                        currencySymbol: this.getCurrencySymbol(currencyCode),
                    };
                }
            }

            return null;
        } catch {
            return null;
        }
    }

    /**
     * Automatically detect user's country.
     * Strategy 1: Browser timezone matched against country-state-city DB (instant, free, no API).
     * Strategy 2: Nominatim reverse geocode via browser geolocation (free, no rate limits).
     * Strategy 3: Sensible default.
     */
    async getCurrentLocation(): Promise<FormattedLocation | null> {
        // Strategy 1: Timezone-based detection (instant, zero API calls)
        const timezoneResult = this.detectFromTimezone();
        if (timezoneResult) return timezoneResult;

        // Strategy 2: Browser Geolocation + OpenStreetMap Nominatim reverse geocode
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator?.geolocation) return reject(new Error('No geolocation'));
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000,
                    maximumAge: 300000, // cache for 5 minutes
                });
            });

            const { latitude, longitude } = position.coords;
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.9',
                        'User-Agent': '180workspace/1.0',
                    },
                }
            );

            if (res.ok) {
                const data = await res.json();
                if (data?.address?.country_code) {
                    return this.parseLocationResult(data);
                }
            }
        } catch (e) {
            // Geolocation denied or Nominatim failed — fall through silently
            console.warn('Geolocation/Nominatim fallback failed:', e);
        }

        // Strategy 3: Default based on browser language
        return this.getDefaultLocation();
    }

    /**
     * Returns a sensible default location derived from the browser's language setting.
     * Uses country-state-city to resolve currency dynamically.
     */
    private getDefaultLocation(): FormattedLocation {
        try {
            // Try to infer country from browser language (e.g., "en-IN" → "IN")
            const locale = navigator?.language || 'en-US';
            const regionCode = locale.split('-')[1]?.toUpperCase();

            if (regionCode) {
                const countryData = Country.getCountryByCode(regionCode);
                if (countryData) {
                    const currencyCode = countryData.currency || 'USD';
                    return {
                        address: countryData.name,
                        city: '',
                        state: '',
                        country: countryData.name,
                        countryCode: countryData.isoCode,
                        currencyCode,
                        currencySymbol: this.getCurrencySymbol(currencyCode),
                    };
                }
            }
        } catch {
            // Fall through to hardcoded default
        }

        return {
            address: 'United States',
            city: '',
            state: '',
            country: 'United States',
            countryCode: 'US',
            currencyCode: 'USD',
            currencySymbol: '$',
        };
    }
}

export const locationService = new LocationService();
