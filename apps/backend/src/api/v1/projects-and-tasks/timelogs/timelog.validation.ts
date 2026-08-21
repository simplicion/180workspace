import { z } from 'zod';

export const timelogSchema = z.object({
  body: z.any().optional(),
});
