import { z } from 'zod';

export const taskSchema = z.object({
  body: z.any().optional(),
});
