import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch currencies');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // Fallback rates if the API fails
        return NextResponse.json({
            base: 'USD',
            rates: {
                USD: 1,
                EUR: 0.92,
                GBP: 0.79,
                INR: 83.1,
                AUD: 1.53,
                CAD: 1.36,
                SGD: 1.34,
                CHF: 0.88,
                MYR: 4.75,
                JPY: 150.1,
                CNY: 7.20,
            }
        });
    }
}
