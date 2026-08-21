import { z } from 'zod';

export const holidaySchema = z.object({
  body: z.any().optional(),
});
