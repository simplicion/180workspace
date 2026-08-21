import { z } from 'zod';

export const AppsValidation = {
    updateConfig: z.object({}).passthrough() // Open schema for config updates
};
