import { z } from 'zod';

export const storageSchema = z.object({
  body: z.any().optional(),
});
