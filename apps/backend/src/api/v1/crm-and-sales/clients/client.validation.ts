import { z } from 'zod';

export const clientSchema = z.object({
  body: z.any().optional(),
});
