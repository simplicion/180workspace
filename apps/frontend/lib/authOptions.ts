import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
    newUser: '/workspace-setup'
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { company: true }
        })
        
        if (user && user.password) {
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (isValid) {
            if (!user.isActive) throw new Error("Account is inactive.");
              const isLegacyOrAdmin = !!user.companyId || (user.role && user.role !== 'employee' && user.role !== 'USER');
              return { 
                id: user.id, 
                name: user.name,
                username: user.username,
                email: user.email, 
                companyId: user.companyId,
                role: user.role,
                isOnboardingComplete: user.company?.isOnboardingComplete || false,
                isFirstLogin: isLegacyOrAdmin ? false : user.isFirstLogin
              } as any
          }
        }
        return null
      }
    }),
    CredentialsProvider({
      id: 'platform-token',
      name: 'Platform Token',
      credentials: {
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.token) return null;
        
        try {
           const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
           const res = await fetch(`${apiUrl}/api/auth/me`, {
             headers: {
               Authorization: `Bearer ${credentials.token}`
             }
           });
           if (!res.ok) return null;
           
           const data = await res.json();
           const userId = data?.user?.id || data?.user?.id;
           if (!userId) return null;
           
           const user = await prisma.user.findUnique({
              where: { id: userId },
              include: { company: true }
           });
           
           if (user && user.isActive) {
             const isLegacyOrAdmin = !!user.companyId || (user.role && user.role !== 'employee' && user.role !== 'USER');
             return { 
               id: user.id, 
               name: user.name,
               username: user.username,
               email: user.email, 
               companyId: user.companyId,
               role: user.role,
               permissions: user.permissions || [],
               isOnboardingComplete: user.company?.isOnboardingComplete || false,
               isFirstLogin: isLegacyOrAdmin ? false : user.isFirstLogin
             } as any;
           }
        } catch(e) {
           console.error("Platform token auth error:", e);
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initialize or update token on sign in
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.companyId = (user as any).companyId;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions || [];
        token.isOnboardingComplete = (user as any).isOnboardingComplete;
        token.isFirstLogin = (user as any).isFirstLogin;
      }
      
      // Handle manual session updates (e.g., after workspace setup is completed)
      if (trigger === "update" && session) {
        token.companyId = session.companyId;
        token.role = session.role;
        if (session.permissions !== undefined) token.permissions = session.permissions;
        token.isOnboardingComplete = session.isOnboardingComplete;
        if (session.isFirstLogin !== undefined) token.isFirstLogin = session.isFirstLogin;
        if (session.username !== undefined) token.username = session.username;
      }

      // If missing data (e.g. Google OAuth login or old token), fetch from DB to attach
      if (token.id && (!token.companyId || token.isFirstLogin === undefined || token.permissions === undefined)) {
        const dbUser = await prisma.user.findUnique({ 
          where: { id: token.id as string },
          include: { company: true }
        });
        if (dbUser) {
          token.companyId = dbUser.companyId;
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.permissions = dbUser.permissions || [];
          token.isOnboardingComplete = dbUser.company?.isOnboardingComplete || false;
          const isLegacyOrAdmin = !!dbUser.companyId || (dbUser.role && dbUser.role !== 'employee' && dbUser.role !== 'USER');
          token.isFirstLogin = isLegacyOrAdmin ? false : dbUser.isFirstLogin;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).companyId = token.companyId;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions || [];
        (session.user as any).isOnboardingComplete = token.isOnboardingComplete;
        (session.user as any).isFirstLogin = token.isFirstLogin;
      }
      return session;
    }
  }
}
