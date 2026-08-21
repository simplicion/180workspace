import { z } from 'zod';

export const emailSchema = z.object({
  body: z.any().optional(),
});
