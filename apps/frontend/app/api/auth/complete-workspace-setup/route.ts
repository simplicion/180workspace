import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@workspace/db';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[Workspace Setup] Session:', JSON.stringify(session, null, 2));

    if (!session || !session.user) {
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
      enabledModules 
    } = await req.json();

    let companyId = (session.user as any).companyId;

    if (!companyId) {
      // Create a new company since the user doesn't have one
      const newCompany = await prisma.company.create({
        data: {
          name: companyName || 'My Startup',
          slug: (companyName || 'My Startup').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 10000),
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
        where: { id: (session.user as any).id },
        data: {
          companyId,
          role: 'admin',
          employeeId: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
          department: 'Admin',
          position: 'Admin'
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

    return NextResponse.json({
      success: true,
      message: 'Workspace configuration completed successfully.',
      companyId: companyId,
      role: 'admin',
    });
  } catch (error: any) {
    console.error('Workspace Setup Error:', error);
    return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 });
  }
}

export const runtime = 'edge';
