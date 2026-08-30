import { NextResponse } from 'next/server';
import { prisma } from '@workspace/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams?.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Scalable check: Query both the DomainRegistry and Company tables in parallel
    // DomainRegistry is the SSOT for global domain uniqueness, but we also check Company to be safe
    const [existingCompany, existingDomainRegistry] = await Promise.all([
      prisma.company.findUnique({
        where: { slug },
      }),
      prisma.domainRegistry.findUnique({
        where: { domain: slug },
        select: { id: true, domain: true }
      })
    ]);

    if (existingCompany || existingDomainRegistry) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true });
  } catch (error: any) {
    console.error('Check company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
