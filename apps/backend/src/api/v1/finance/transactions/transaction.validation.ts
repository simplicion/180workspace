import { z } from 'zod';

export const transactionSchema = z.object({
  body: z.any().optional(),
});
