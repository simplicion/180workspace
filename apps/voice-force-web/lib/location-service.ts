class LocationService {
  /**
   * Get currency symbol using native Intl API
   */
  getCurrencySymbol(currencyCode: string = 'USD'): string {
    try {
      const code = currencyCode.toUpperCase();
      if (code === 'INR') return '₹';
      if (code === 'USD') return '$';
      if (code === 'EUR') return '€';
      if (code === 'GBP') return '£';
      return (0).toLocaleString('en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).replace(/\d/g, '').trim() || code;
    } catch (e) {
      return currencyCode;
    }
  }
}

export const locationService = new LocationService();
export default locationService;
