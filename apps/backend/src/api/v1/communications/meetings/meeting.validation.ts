import { z } from 'zod';

export const meetingSchema = z.object({
  body: z.any().optional(),
});
