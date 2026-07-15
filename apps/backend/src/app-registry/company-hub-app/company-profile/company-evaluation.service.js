'use strict';

/**
 * Service for evaluating company metrics such as Startup Stage.
 */
class CompanyEvaluationService {
    /**
     * Determine the startup stage based on current metrics.
     * @param {Object} company - The company data
     * @param {Number} employeeCount - Total active employees
     * @returns {String}
     */
    evaluateStartupStage(company, employeeCount) {
        // Simple logic as requested: < 5 is Startup, >= 5 is Growth Stage
        // Later this can be expanded with revenue, funding rounds, etc.
        const count = employeeCount || 0;
        
        if (count < 5) {
            return 'Startup';
        } else {
            return 'Growth Stage';
        }
    }
}

module.exports = new CompanyEvaluationService();
