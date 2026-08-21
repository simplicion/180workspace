import { z } from 'zod';

export const vendorSchema = z.object({
  body: z.any().optional(),
});
