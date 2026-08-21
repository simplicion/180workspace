import { z } from 'zod';

export const hrmsSchema = z.object({
  body: z.any().optional(),
});
