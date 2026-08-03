import { NextResponse } from 'next/server';
import { prisma } from '@workspace/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password, companyName, logoBase64 } = await req.json();

    if (!email || !password || !name || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.companyId) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name: companyName,
        slug: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        databaseConfigured: true, // We are using a single DB now
        isOnboardingComplete: false,
        logoUrl: logoBase64 || null,
      },
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    if (existingUser) {
      // Update existing user (e.g. from Google Sign-In) to add company and password
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: hashedPassword,
          companyId: company.id,
          role: 'ceo',
        },
      });
    } else {
      // Create user and link to company
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ceo',
          companyId: company.id,
        },
      });
    }

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to register user', details: error?.toString() }, { status: 500 });
  }
}

