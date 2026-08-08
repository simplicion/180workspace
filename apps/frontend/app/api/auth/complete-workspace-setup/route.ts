import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@workspace/db';
import jwt from 'jsonwebtoken';

export async function PUT(req: Request) {
  try {
    const token = await getToken({ req: req as any });
    console.log('[Workspace Setup] Token:', JSON.stringify(token, null, 2));

    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      companyName, 
      oneLineDescription, 
      website, 
      logoUrl, 
      industry, 
      startupStage, 
      teamSize, 
      enabledApps, 
      enabledModules,
      slug
    } = await req.json();

    let companyId = (token as any).companyId;

    if (!companyId) {
      // Create a new company since the user doesn't have one
      const generatedSlug = slug || (companyName || 'My Startup').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 10000);
      const newCompany = await prisma.company.create({
        data: {
          name: companyName || 'My Startup',
          slug: generatedSlug,
          databaseConfigured: true,
          isOnboardingComplete: true,
          oneLineDescription,
          website,
          logoUrl: logoUrl || null,
          industry,
          startupStage,
          teamSize,
          metadata: {
            enabledApps,
            enabledModules,
          }
        }
      });

      companyId = newCompany.id;

      // Link the new company to the user and make them an admin
      await prisma.user.update({
        where: { id: (token as any).id },
        data: {
          companyId,
          role: 'admin',
          employeeId: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
          department: 'Admin',
          position: 'Admin'
        }
      });

      // Create TenantUserMapping to ensure backend can resolve it
      await prisma.tenantUserMapping.create({
        data: {
          userId: (token as any).id,
          email: token.email as string,
          companyId,
          role: 'admin',
          subdomain: slug || currentCompany?.slug || 'default'
        }
      });
    } else {
      // 1. Fetch current company to get existing metadata
      const currentCompany = await prisma.company.findUnique({
        where: { id: companyId }
      });

      const currentMetadata = (currentCompany?.metadata as Record<string, any>) || {};

      // 2. Update Company status and merge metadata in System DB
      await prisma.company.update({
        where: { id: companyId },
        data: {
          isOnboardingComplete: true,
          name: companyName || currentCompany?.name || 'My Startup',
          slug: slug || currentCompany?.slug,
          oneLineDescription,
          website,
          logoUrl: logoUrl || currentCompany?.logoUrl,
          industry,
          startupStage,
          teamSize,
          metadata: {
            ...currentMetadata,
            enabledApps,
            enabledModules,
          }
        },
      });
    }

    // Fetch the company to return its slug for subdomain routing
    const finalCompany = await prisma.company.findUnique({ where: { id: companyId }, select: { slug: true, customDomain: true } });

    // Generate a backend platform_auth_token so the user stays logged in
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    let platformToken = null;
    if (secret) {
      platformToken = jwt.sign({ id: (token as any).id, companyId }, secret, { expiresIn: '15m' });
    }

    return NextResponse.json({
      success: true,
      message: 'Workspace configuration completed successfully.',
      companyId: companyId,
      companySlug: finalCompany?.slug || null,
      companyCustomDomain: finalCompany?.customDomain || null,
      role: 'admin',
      platformToken,
    });
  } catch (error: any) {
    console.error('Workspace Setup Error:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Session invalid. User or company record was deleted.' },
        { status: 401 }
      );
    }

    require('fs').appendFileSync('C:/Users/saavi/OneDrive/Desktop/180workspace/setup_error.log', error?.stack + '\\n');
    return NextResponse.json({ error: error?.message || 'Failed to complete setup' }, { status: 500 });
  }
}

