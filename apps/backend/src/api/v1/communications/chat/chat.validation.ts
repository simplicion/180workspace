import { z } from 'zod';

export const chatSchema = z.object({
  body: z.any().optional(),
});
