import { NextResponse } from 'next/server';
import { prisma } from '@workspace/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams?.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const existingCompany = await prisma.company.findUnique({
      where: { slug },
    });

    if (existingCompany) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true });
  } catch (error: any) {
    console.error('Check company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
