import { z } from 'zod';

export const worklogSchema = z.object({
  body: z.any().optional(),
});
