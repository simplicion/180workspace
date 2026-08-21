import { z } from 'zod';

export const ConfigsValidation = {
    updateSettings: z.object({}).passthrough()
};
