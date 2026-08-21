import { z } from 'zod';

export const calendarSchema = z.object({
  body: z.any().optional(),
});
