import { z } from 'zod';

export const expenseSchema = z.object({
  body: z.any().optional(),
});
