import { z } from 'zod';

export const invoiceSchema = z.object({
  body: z.any().optional(),
});
