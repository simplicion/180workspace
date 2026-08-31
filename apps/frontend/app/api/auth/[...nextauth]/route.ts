import NextAuth from "next-auth"
import { authOptions } from "@/lib/authOptions"

const handler = NextAuth(authOptions)

// Next.js 15 NextAuth App Router Route Handler
export async function GET(request: Request, context: any) {
    const params = await context?.params;
    return handler(request, { ...context, params });
}

export async function POST(request: Request, context: any) {
    const params = await context?.params;
    return handler(request, { ...context, params });
}
