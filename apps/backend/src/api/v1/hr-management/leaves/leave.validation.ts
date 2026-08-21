import { z } from 'zod';

export const leaveSchema = z.object({
  body: z.any().optional(),
});
