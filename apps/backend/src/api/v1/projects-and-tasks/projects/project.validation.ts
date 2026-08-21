import { z } from 'zod';

export const projectSchema = z.object({
  // Extend as needed for future validation
  body: z.any().optional(),
});
