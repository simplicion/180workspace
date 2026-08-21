import { z } from 'zod';

export const documentsSchema = z.object({
  body: z.any().optional(),
});
