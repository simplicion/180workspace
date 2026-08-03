import { NextResponse } from 'next/server';
import { prisma } from '@workspace/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');

        if (!username) {
            return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
        }

        // Check if username contains only valid characters (alphanumeric, underscore, dot)
        const usernameRegex = /^[a-zA-Z0-9_.]+$/;
        if (!usernameRegex.test(username)) {
             return NextResponse.json({ success: true, available: false, message: 'Invalid format' });
        }

        // Check availability
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return NextResponse.json({ success: true, available: false });
        }

        return NextResponse.json({ success: true, available: true });

    } catch (error) {
        console.error('Error checking username:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export const runtime = 'edge';
