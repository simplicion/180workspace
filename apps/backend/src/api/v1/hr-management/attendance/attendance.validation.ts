import { z } from 'zod';

export const attendanceSchema = z.object({
  body: z.any().optional(),
});
