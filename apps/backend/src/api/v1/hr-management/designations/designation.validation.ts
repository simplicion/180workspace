import { z } from 'zod';

export const designationSchema = z.object({
  body: z.any().optional(),
});
