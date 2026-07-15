'use strict';

class PayoutProviderInterface {
    constructor(config) {
        if (new.target === PayoutProviderInterface) {
            throw new TypeError("Cannot construct Abstract instances directly");
        }
        this.config = config;
    }

    async initialize() {
        throw new Error('Method "initialize()" must be implemented.');
    }

    async createFundAccount(employeeDetails) {
        throw new Error('Method "createFundAccount()" must be implemented.');
    }

    async initiatePayout({ fundAccountId, amount, currency, referenceId, purpose }) {
        throw new Error('Method "initiatePayout()" must be implemented.');
    }

    async getPayoutStatus(payoutId) {
        throw new Error('Method "getPayoutStatus()" must be implemented.');
    }
}

module.exports = PayoutProviderInterface;
