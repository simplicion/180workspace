import { authOptions } from '@/lib/authOptions'; export async function GET() { return Response.json({ success: true, keys: Object.keys(authOptions) }); }

export const runtime = 'edge';
