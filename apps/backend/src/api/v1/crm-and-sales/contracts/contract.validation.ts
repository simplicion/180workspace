import { z } from 'zod';

export const contractSchema = z.object({
  body: z.any().optional(),
});
