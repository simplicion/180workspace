import { z } from 'zod';

export const milestoneSchema = z.object({
  body: z.any().optional(),
});
