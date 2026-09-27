'use strict';

import axios from 'axios';

export interface ResolvedLocation {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    formatted: string;
}

export class LocationService {
    /**
     * Reverse geocode latitude and longitude coordinates into city and country
     */
    static async resolveCoordinates(latitude: number, longitude: number): Promise<ResolvedLocation> {
        try {
            // Fast, free, reverse geocoding via OpenStreetMap Nominatim
            const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                params: {
                    lat: latitude,
                    lon: longitude,
                    format: 'json',
                    zoom: 10
                },
                headers: {
                    'User-Agent': '180Identity/1.0 (info@180workspace.com)'
                },
                timeout: 5000
            });

            const address = response.data?.address || {};
            const city = address.city || address.town || address.village || address.state_district || address.state || '';
            const country = address.country || '';
            const formatted = [city, country].filter(Boolean).join(', ') || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

            return {
                latitude,
                longitude,
                city,
                country,
                formatted
            };
        } catch (e: any) {
            // Graceful fallback if external lookup times out
            return {
                latitude,
                longitude,
                city: '',
                country: '',
                formatted: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
            };
        }
    }
}
