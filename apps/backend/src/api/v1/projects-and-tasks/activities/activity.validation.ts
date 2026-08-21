import { z } from 'zod';

export const activitySchema = z.object({
  body: z.any().optional(),
});
