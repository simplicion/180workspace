import { PlatformPlanRepository } from '../repositories/platform-plan.repository';

export class PlatformPlanService {
    static async list() {
        return await PlatformPlanRepository.list();
    }
}
