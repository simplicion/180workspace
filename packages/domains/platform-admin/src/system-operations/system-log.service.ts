import { SystemLogRepository } from '../repositories/system-log.repository';

export class SystemLogService {
    static async getActivityLogs(page: number, limit: number) {
        const [logs, total] = await SystemLogRepository.getLogs(page, limit);
        return { logs, total };
    }

    static async getFailedLogins(page: number, limit: number) {
        const [logs, total] = await SystemLogRepository.getFailedLogins(page, limit);
        return { logs, total };
    }
}
