import { z } from 'zod';

export const employeeSchema = z.object({
  body: z.any().optional(),
});
