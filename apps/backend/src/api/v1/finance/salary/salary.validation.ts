import { z } from 'zod';

export const salarySchema = z.object({
  body: z.any().optional(),
});
