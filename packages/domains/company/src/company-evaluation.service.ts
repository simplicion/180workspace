import { prisma } from '@workspace/db';
/**
 * Service for evaluating company metrics such as Startup Stage.
 */
export class CompanyEvaluationService {
    /**
     * Determine the startup stage based on current metrics.
     * @param company - The company data
     * @param employeeCount - Total active employees
     * @returns stage
     */
    static evaluateStartupStage(company: any, employeeCount: number) {
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
