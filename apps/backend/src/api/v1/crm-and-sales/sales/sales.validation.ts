import { z } from 'zod';

export const salesSchema = z.object({
  body: z.any().optional(),
});
