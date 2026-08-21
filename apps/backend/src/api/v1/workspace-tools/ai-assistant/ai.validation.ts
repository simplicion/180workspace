import { z } from 'zod';

export const aiSchema = z.object({
  body: z.any().optional(),
});
