import { z } from 'zod';

export const financeSchema = z.object({
  body: z.any().optional(),
});
