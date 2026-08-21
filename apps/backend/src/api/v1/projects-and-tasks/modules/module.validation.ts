import { z } from 'zod';

export const moduleSchema = z.object({
  body: z.any().optional(),
});
